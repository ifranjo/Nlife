# ModularHub - Especificaciones y Requisitos

> Documento operativo: qué debe hacer el sistema, no cómo
> Versión: 0.1 (borrador para validar)

---

## 1. Problema a Resolver

**Situación actual:**
- Tengo varios PCs (casa, trabajo, etc.)
- Quiero gestionar/monitorear desde un solo lugar
- Quiero poder añadir funcionalidades sin rehacer todo

**Lo que necesito:**
- Un panel central (web)
- Que los PCs se conecten a ese panel
- Poder "enchufar" apps/módulos fácilmente

---

## 2. Usuarios del Sistema

| Rol | Descripción | Acciones |
|-----|-------------|----------|
| Admin (tú) | Controla todo | Ver agentes, desplegar módulos, configurar |
| Agente | Software en cada PC | Conectar, reportar estado, ejecutar módulos |

*(Por ahora sin multi-usuario, solo tú)*

---

## 3. Requisitos Funcionales

### 3.1 Dashboard (Panel Web)

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| D1 | Ver lista de agentes conectados | MUST |
| D2 | Ver estado de cada agente (online/offline) | MUST |
| D3 | Ver métricas básicas (CPU, RAM) | SHOULD |
| D4 | Área para incrustar módulos/widgets | MUST |
| D5 | Enviar comandos a un agente | SHOULD |
| D6 | Catálogo de módulos disponibles | COULD |
| D7 | Histórico de acciones | COULD |

### 3.2 Sistema de Módulos (Acoples)

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| M1 | Añadir un módulo sin tocar código del dashboard | MUST |
| M2 | Módulo = carpeta con archivos (convenio simple) | MUST |
| M3 | Módulo puede ser: widget web, script, o app | SHOULD |
| M4 | Módulo declara qué necesita (manifest) | SHOULD |
| M5 | Hot-reload: añadir módulo sin reiniciar | COULD |

### 3.3 Agente (Software en cada PC)

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| A1 | Conectar al dashboard automáticamente | MUST |
| A2 | Reconectar si se pierde conexión | MUST |
| A3 | Reportar métricas básicas | SHOULD |
| A4 | Ejecutar módulos/scripts recibidos | SHOULD |
| A5 | Funcionar en Windows | MUST |
| A6 | Funcionar en Linux | COULD |

---

## 4. Requisitos No Funcionales

| ID | Requisito | Detalle |
|----|-----------|---------|
| NF1 | Simple de entender | Código legible, no magia negra |
| NF2 | Sin vendor lock-in | No depender de servicios de pago obligatorios |
| NF3 | Extensible | Añadir módulos debe ser fácil |
| NF4 | Seguro (básico) | HTTPS, tokens, no ejecutar código random |
| NF5 | Documentado | Cada decisión explicada |

---

## 5. Concepto de "Módulo" (Acople)

Un módulo es una unidad independiente que se puede enchufar al sistema.

### Tipos de módulo:

```
┌─────────────────────────────────────────────────────────────────┐
│ TIPO 1: Widget de Dashboard                                     │
├─────────────────────────────────────────────────────────────────┤
│ • Se muestra DENTRO del panel web                               │
│ • Ejemplo: calculadora, reloj, gráfico                          │
│ • Tecnología: React component, iframe, web component            │
│                                                                 │
│ modules/                                                        │
│   calculator/                                                   │
│     manifest.json    ← Metadata del módulo                      │
│     Calculator.tsx   ← Componente React                         │
│     styles.css       ← Estilos (opcional)                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TIPO 2: Script Remoto                                           │
├─────────────────────────────────────────────────────────────────┤
│ • Se ejecuta en el PC del agente                                │
│ • Ejemplo: obtener info del sistema, ejecutar backup            │
│ • Tecnología: PowerShell, Bash, Python                          │
│                                                                 │
│ modules/                                                        │
│   system-info/                                                  │
│     manifest.json    ← Metadata + permisos                      │
│     main.ps1         ← Script a ejecutar                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TIPO 3: App Standalone (futuro)                                 │
├─────────────────────────────────────────────────────────────────┤
│ • App completa que se integra                                   │
│ • Ejemplo: mini-app de notas, gestor de tareas                  │
│ • Tecnología: cualquiera que exporte interfaz estándar          │
└─────────────────────────────────────────────────────────────────┘
```

### Manifest de módulo (ejemplo):

```json
{
  "id": "calculator",
  "name": "Calculadora",
  "version": "1.0.0",
  "type": "widget",
  "entry": "Calculator.tsx",
  "icon": "calculator.svg",
  "size": {
    "width": 300,
    "height": 400
  }
}
```

---

## 6. Flujos Principales

### Flujo 1: Ver agentes conectados

```
Usuario                Dashboard               Agente(s)
   │                      │                       │
   │  Abrir /dashboard    │                       │
   │─────────────────────►│                       │
   │                      │                       │
   │  Lista de agentes    │◄──── heartbeat ──────│
   │◄─────────────────────│                       │
   │                      │                       │
   │  [PC-Casa: Online]   │                       │
   │  [PC-Trabajo: Off]   │                       │
```

### Flujo 2: Añadir módulo widget

```
Usuario                Dashboard               Módulo
   │                      │                      │
   │  Crear carpeta       │                      │
   │  modules/mi-widget/  │                      │
   │         │            │                      │
   │         ▼            │                      │
   │  manifest.json +     │                      │
   │  MiWidget.tsx        │                      │
   │         │            │                      │
   │         ▼            │                      │
   │  Dashboard detecta   │                      │
   │  nuevo módulo        │◄─────────────────────│
   │         │            │                      │
   │         ▼            │                      │
   │  Widget disponible   │                      │
   │  en catálogo         │                      │
```

### Flujo 3: Ejecutar script en agente

```
Usuario                Dashboard               Agente
   │                      │                      │
   │  Seleccionar agente  │                      │
   │  + módulo "sysinfo"  │                      │
   │─────────────────────►│                      │
   │                      │                      │
   │                      │  Enviar comando      │
   │                      │─────────────────────►│
   │                      │                      │
   │                      │  Ejecutar script     │
   │                      │         │            │
   │                      │         ▼            │
   │                      │  Resultado JSON      │
   │                      │◄─────────────────────│
   │                      │                      │
   │  Ver resultado       │                      │
   │◄─────────────────────│                      │
```

---

## 7. Decisiones Tomadas (Diálogo Socrático 2026-01-26)

| # | Pregunta | Decisión | Razón |
|---|----------|----------|-------|
| 1 | ¿Reutilizar proyecto existente? | **Proyecto NUEVO separado** | Empezar limpio |
| 2 | ¿Framework dashboard? | **Next.js** | Estándar industria, mejor para curro |
| 3 | ¿Método de login? | **Email + password** | Control de usuarios |
| 4 | ¿Base de datos? | **SQLite** | Simple, sin dependencias externas |
| 5 | ¿Lenguaje WS server? | **Node.js** | Mismo lenguaje que dashboard |
| 6 | ¿Lenguaje Agent? | **Node.js** | Stack unificado TypeScript |
| 7 | ¿Hosting WS server? | **Local primero** (portátil Ubuntu) | Aprender, luego cloud |
| 8 | ¿Cómo se cargan widgets? | **Híbrido** (React + iframes) | Flexibilidad máxima |

---

## 8. Criterios de Éxito del MVP

**El MVP está completo cuando:**

- [ ] Puedo abrir el dashboard y ver si un agente está conectado
- [ ] Puedo añadir una carpeta con un widget y que aparezca en el dashboard
- [ ] El widget funciona sin tocar código del dashboard core

**NO es necesario para MVP:**

- Login/autenticación (solo tú lo usas)
- Múltiples usuarios
- Ejecución de scripts remotos
- Base de datos
- UI bonita

---

## 9. Stack Definitivo (Post-Diálogo Socrático)

| Componente | Tecnología | Hosting | Notas |
|------------|------------|---------|-------|
| **Dashboard** | Next.js + React | Vercel | Proyecto nuevo |
| **Auth** | Auth.js + Credentials | Vercel | Email + password |
| **Base de datos** | SQLite + Prisma | Local (archivo) | Simple, portátil |
| **WebSocket Server** | Node.js + ws | Tu portátil Ubuntu | Luego cloud |
| **Agent** | Node.js + ws | Cada PC | Empaquetable con pkg |
| **Módulos widget** | React + iframes | - | Híbrido, flexible |
| **Módulos remotos** | Scripts (PS/Bash) | - | Simple para empezar |

### Arquitectura Final

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   VERCEL                         TU PORTÁTIL UBUNTU                         │
│   ┌─────────────────────┐       ┌─────────────────────┐                    │
│   │ Dashboard (Next.js) │       │ WebSocket Server    │                    │
│   │ + Auth.js           │◄─────►│ (Node.js + ws)      │                    │
│   │ + SQLite            │ HTTP  │                     │                    │
│   │ + React widgets     │       │ Cloudflare Tunnel   │                    │
│   └─────────────────────┘       └──────────┬──────────┘                    │
│                                            │                                │
│                                            │ WSS                            │
│                                            │                                │
│                       ┌────────────────────┼────────────────────┐          │
│                       │                    │                    │          │
│                       ▼                    ▼                    ▼          │
│                  ┌─────────┐          ┌─────────┐          ┌─────────┐     │
│                  │ Agent   │          │ Agent   │          │ Agent   │     │
│                  │ Node.js │          │ Node.js │          │ Node.js │     │
│                  │ PC-Casa │          │ PC-Work │          │ PC-N    │     │
│                  └─────────┘          └─────────┘          └─────────┘     │
│                                                                             │
│   LENGUAJE ÚNICO: TypeScript en todo el stack                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Ventajas de este stack

1. **Un solo lenguaje**: TypeScript/JavaScript en dashboard, server y agents
2. **Código compartido**: Tipos, utilidades, validaciones reutilizables
3. **Ecosistema rico**: npm tiene librerías para todo
4. **Debugging unificado**: Mismas herramientas en todo el stack
5. **Aprendizaje transferible**: Next.js es el framework más demandado

---

## Changelog

- 0.1 (2026-01-26): Borrador inicial para validar concepto
