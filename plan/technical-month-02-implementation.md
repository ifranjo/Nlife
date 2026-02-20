# Plan de Implementación Técnica - Iteración #2
**New Life Solutions - Performance Optimization**
**Período**: 2025-01-08 → 2025-02-08
**Objetivo**: -15% promedio en LCP (2980ms → 2533ms)

---

## 📊 BASELINE (Iteración #1)

**Métricas de Partida** (de `data/baseline-performance-2025-01-08.json`):

| Herramienta | LCP Desktop | Target Δ | Prioridad | Esfuerzo |
|-------------|-------------|----------|-----------|----------|
| pdf-merge | 3200ms | -15% (2720ms) | High | Medium |
| image-compress | 2800ms | -15% (2380ms) | High | Low |
| video-compress | 3400ms | -15% (2890ms) | Critical | High |
| ai-transcribe | 3000ms | -15% (2550ms) | High | Medium |
| json-format | 2500ms | -15% (2125ms) | Medium | Low |
| **PROMEDIO** | **2980ms** | **-15% (2533ms)** |

**Problemas Identificados**:\n- Heavy library loading (FFmpeg ~50MB, Whisper ~50MB)
- No resource hints (preload/preconnect)
- Large WASM binaries
- No progressive loading indicators

---

## 🎯 IMPLEMENTACIONES PRIORIZADAS

### Tarea #1: Progressive Loading para FFmpeg (video-compress)
**Impacto**: -500ms LCP (highest among all tools)
**Herramienta**: video-compress (4200ms LCP actual)

#### Before Measurement
```bash
# Medir baseline actual
LCP: 3400ms (desktop) / 4200ms (mobile)
Library Load Time: ~1800ms
Bundle Size: ~280MB loaded eagerly
```

#### Implementación

**Cambio en `src/components/tools/VideoCompress.tsx`**:

```typescript
// BEFORE (current code - hypothetical)
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

// AFTER (optimized with progressive loading)
// Dynamic import with loading indicators
const loadFFmpeg = async () => {
  if (typeof window === 'undefined') return null;

  const { createFFmpeg, fetchFile } = await import('@ffmpeg/ffmpeg');
  const ffmpeg = createFFmpeg({
    log: false,
    progress: (p) => {
      // Show loading progress to user
      if (p.ratio) {
        setLoadingProgress(Math.round(p.ratio * 100));
      }
    }
  });

  await ffmpeg.load();
  return { ffmpeg, fetchFile };
};
```

**Cambio en Astro template**:
```astro
<!-- Add resource hints to <head> -->
<link rel="preload"
      href="/_astro/ffmpeg.XXX.wasm"
      as="fetch"
      type="application/wasm"
      crossorigin="anonymous">
```

#### After Measurement (Target)
```bash
# Medir después de implementación
LCP: 2670ms (desktop) / 3470ms (mobile)
Library Load Time: ~1200ms (Δ -33%)
Bundle Size: ~50MB initial + 230MB on demand
```

**Expected Improvement**: -22% LCP verification

---

### Tarea #2: Resource Hints (Preload Critical Resources)
**Impacto**: -300ms LCP global
**Herramientas**: Todos los tools

#### Implementación

**Archivo**: `apps/web/src/layouts/ToolLayout.astro`

```astro
<head>
  <!-- Preload critical fonts -->
  <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>

  <!-- Preconnect to external CDNs -->
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://unpkg.com">

  <!-- DNS prefetch for analytics -->
  <link rel="dns-prefetch" href="https://cdn.usefathom.com">
</head>
```

**Archivo**: `apps/web/public/_headers` (for Netlify/Vercel)
```
# HTTP Resource Hints
Link: </fonts/inter.woff2>; rel=preload; as=font; crossorigin
Link: <https://cdn.jsdelivr.net>; rel=preconnect; crossorigin
```

#### Expected Impact
- Font loading: -100ms LCP
- External resources: -150ms LCP
- DNS resolution: -50ms LCP
- **Total**: -300ms global LCP

---

### Tarea #3: IndexedDB Caching para AI Models (ai-transcribe)
**Impacto**: -500ms en segunda visita
**Herramienta**: ai-transcribe

#### Implementación

**Archivo**: `src/lib/model-cache.ts` (NEW)
```typescript
export class ModelCache {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'ai-models-v1';
  private readonly STORE_NAME = 'transformers';

  async init() {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveModel(name: string, model: any) {
    if (!this.db) return;

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    return store.put(model, name);
  }

  async loadModel(name: string): Promise<any> {
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(name);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }
}
```

**Uso en ai-transcribe component**:
```typescript
import { ModelCache } from '../../lib/model-cache';

const modelCache = new ModelCache();

// Check cache before loading
const cachedModel = await modelCache.loadModel('whisper-tiny-en');
if (cachedModel) {
  setModel(cachedModel);
} else {
  // Load model and cache it
  const transformers = await import('@huggingface/transformers');
  const model = await transformers.pipeline('automatic-speech-recognition');
  await modelCache.saveModel('whisper-tiny-en', model);
  setModel(model);
}
```

#### Expected Impact
- **First load**: 3000ms (no change)
- **Second load**: 800ms (73% improvement)
- **Cache hit rate**: Expected 65% (returning users)
- **Average improvement**: -500ms weighted average

---

### Tarea #4: WebP Image Optimization (all tools)
**Impacto**: -150ms LCP, -60% bandwidth
**Escope**: Thumbnails e íconos

#### Implementación

**Task**: Convertir thumbnails PNG/JPG a WebP con fallback

```bash
# Usar cwebp para convertir
for file in public/thumbnails/*.{png,jpg}; do
  cwebp -q 85 "$file" -o "${file%.*}.webp"
done
```

**Astro component con fallback**:
```astro
---
interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
}

const { src, alt, width, height } = Astro.props;
const webpSrc = src.replace(/\.(png|jpg)$/, '.webp');
---

<picture>
  <source srcset={webpSrc} type="image/webp">
  <img
    src={src}
    alt={alt}
    width={width}
    height={height}
    loading="eager"
    decoding="async"
  />
</picture>
```

#### Expected Impact
- Image size: -60% average
- LCP improvement: -150ms
- Bandwidth: -45% for thumbnails

---

## 📋 ORDEN DE IMPLEMENTACIÓN

### Semana 1 (2025-01-15 → 2025-01-22)
**Foco**: Performance crítico (video-compress)

1. **Día 1**: Implementar progressive loading FFmpeg
   - Base: `src/components/tools/VideoCompress.tsx`
   - Test: video-compress tool functionality

2. **Día 2-3**: IndexedDB caching strategy
   - Nuevo: `src/lib/model-cache.ts`
   - Update: `src/components/tools/AiTranscribe.tsx`

3. **Día 4**: Resource hints (preload/preconnect)
   - Update: `apps/web/src/layouts/ToolLayout.astro`
   - Update: `apps/web/public/_headers`

4. **Día 5**: Medición y validación
   - Ejecutar: `measure-performance.ps1`
   - Medir: Before/after para video-compress
   - Documentar: `iterations/iteration-02-report.md`

### Semana 2 (2025-01-23 → 2025-01-30)
**Foco**: Global optimizations (all tools)

1. **Día 6**: WebP conversion for thumbnails
   - Convert: `public/thumbnails/*.webp`
   - Update: ToolCard.astro component

2. **Día 7-8**: Apply FFmpeg optimization to other heavy tools
   - Update: `src/components/tools/ImageCompress.tsx`
   - Update: `src/components/tools/PdfMerge.tsx`

3. **Día 9**: Cross-browser testing
   - Test: Chrome, Firefox, Safari
   - Validate: All tools load correctly
   - Check: Loading indicators visible

4. **Día 10**: Performance validation
   - Ejecutar: Full performance audit
   - Comparar: Con baseline (15% target)
   - Documentar: Resultados en reporte

### Semana 3 (2025-01-31 → 2025-02-07)
**Foco**: Relleno y documentación

1. **Día 11-12**: Code cleanup y optimization
   - Remove: Unused imports and variables
   - Optimize: Bundle splitting configuration
   - Review: Lighthouse CI integration

2. **Día 13-14**: Contenido conversacional (ver tarea paralela)
   - Crear: 5 páginas GEO-optimizadas
   - Integrar: Demos de herramientas
   - Validar: Schema markup

3. **Día 15**: Análisis final y documentación
   - Medir: Métricas finales del mes
   - Crear: `iterations/iteration-02-report.md`
   - Actualizar: `agents.md` con nuevos patrones

---

## 📊 VALIDACIÓN ANTI-HALUCINACIÓN

### Para Cada Tarea, Requerir:

**Before Measurement**:
```bash
# Ejecutar antes de implementar
.\measure-performance.ps1 -OutputFile "data/before-ffmpeg-optimization.json"
```

**After Measurement**:
```bash
# Ejecutar después de implementar
.\measure-performance.ps1 -OutputFile "data/after-ffmpeg-optimization.json"
```

**Delta Calculation**:
```javascript
const before = require('./data/before-ffmpeg-optimization.json');
const after = require('./data/after-ffmpeg-optimization.json');

const delta = ((after.LCP - before.LCP) / before.LCP) * 100;

if (delta <= -5) {
  console.log('✅ MEJORA VALIDADA');
  // Documentar en agents.md
} else if (delta > -5 && delta < 5) {
  console.log('⚠️ MEJORA INSIGNIFICANTE');
  // Rollback y analizar
} else {
  console.log('❌ REGRESIÓN DETECTADA');
  // Revertir inmediatamente
}
```

---

## 🎯 OBJETIVOS DE ITERACIÓN #2

### Target Específico
```json
{
  "performance": {
    "lcp_desktop_average": "2533ms (Δ -15%)",
    "lcp_mobile_average": "3060ms (Δ -15%)",
    "lighthouse_average": "83 (Δ +13%)",
    "core_web_vitals": "IMPROVING"
  },
  "geo": {
    "ai_citations": "3-5 (primera detección)",
    "ai_bot_access": "1+ active crawls detected",
    "llms_txt_adoption": "Tracked in logs"
  },
  "content": {
    "conversational_pages": "5 publicadas",
    "faq_schemas": "30+ implementados"
  }
}
```

---

## 📅 TIMELINE DE 30 DÍAS

| Fecha | Día | Acción | Output |
|-------|-----|--------|--------|
| 2025-01-08 | 0 | Planificación completa | Este documento |
| 2025-01-15 | 7 | Progressive FFmpeg | Working video-compress |
| 2025-01-22 | 14 | IndexedDB + Resource hints | All tools optimized |
| 2025-01-29 | 21 | WebP + Testing | Cross-browser validated |
| 2025-02-05 | 28 | Measurement + Documentation | iteration-02-report.md |
| 2025-02-08 | 30 | Iteración completa | Validation vs baseline |

---

## 🎊 CRITERIOS DE ÉXITO

### ✅ Completado Exitosamente
- [ ] 3+ optimizaciones técnicas implementadas
- [ ] 5+ páginas conversacionales publicadas
- [ ] 1+ AI bot access detectado en logs
- [ ] -15% LCP improvement validado
- [ ] 0 regressiones en otras métricas
- [ ] Documentación completa en iteration-02-report.md
- [ ] agents.md actualizado con nuevos patrones

### ❌ Requiere Continuar
- [ ] Menos de 3 optimizaciones completas
- [ ] No se detectan AI bot accesses
- [ ] LCP improvement <10%
- [ ] Regressiones detectadas
- [ ] Falta documentación

**Si no se cumple success**: Extender Iteración #2 una semana adicional

---

## 📞 RECURSOS Y REFERENCIAS

**Baseline Data**: `data/baseline-performance-2025-01-08.json`
**Implementation Guide**: `docs/geo-system/GEO_IMPLEMENTATION_GUIDE.md`
**Content Template**: `docs/geo-system/CONTENT_TEMPLATE.md`
**Previous Report**: `iterations/iteration-01-report.md`
**Monitoring Scripts**: `scripts/monitoring/measure-performance.ps1`

---

**Created**: 2025-01-08
**Owner**: Technical Agent (Claude)
**Collaborator**: Content Agent (Kimi) - Parallel work on conversational pages
**Next Review**: 2025-01-15 (Week 1 checkpoint)
**Final Target**: 2025-02-08 (30 days)
