# ModularHub - Arquitectura Técnica v1.0

> Sistema de dashboard central con agentes remotos modulares
> Proyecto: newlifesolutions.dev → ModularHub
> Fecha: 2026-01-26

---

## 1. Visión General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MODULARHUB SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │                    DASHBOARD (Vercel)                             │     │
│    │                                                                   │     │
│    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │     │
│    │  │   Astro     │  │   Module    │  │   Agent     │               │     │
│    │  │   Frontend  │  │   Registry  │  │   Monitor   │               │     │
│    │  │   (React)   │  │   (CRUD)    │  │   (Status)  │               │     │
│    │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘               │     │
│    │         │                │                │                       │     │
│    │         └────────────────┴────────────────┘                       │     │
│    │                          │                                        │     │
│    │                  ┌───────┴───────┐                                │     │
│    │                  │   WebSocket   │                                │     │
│    │                  │   Gateway     │                                │     │
│    │                  │   (Vercel)    │                                │     │
│    │                  └───────┬───────┘                                │     │
│    └──────────────────────────┼────────────────────────────────────────┘     │
│                               │                                              │
│                               │ WSS (TLS encrypted)                          │
│                               │                                              │
│    ┌──────────────────────────┼──────────────────────────────────────┐      │
│    │                          │        INTERNET                       │      │
│    └──────────────────────────┼──────────────────────────────────────┘      │
│                               │                                              │
│         ┌─────────────────────┼─────────────────────┐                       │
│         │                     │                     │                       │
│         ▼                     ▼                     ▼                       │
│    ┌─────────┐          ┌─────────┐          ┌─────────┐                    │
│    │ Agent 1 │          │ Agent 2 │          │ Agent N │                    │
│    │ ┌─────┐ │          │ ┌─────┐ │          │ ┌─────┐ │                    │
│    │ │Mod A│ │          │ │Mod B│ │          │ │Mod X│ │                    │
│    │ │Mod B│ │          │ │Mod C│ │          │ │Mod Y│ │                    │
│    │ └─────┘ │          │ └─────┘ │          │ └─────┘ │                    │
│    │  PC #1  │          │  PC #2  │          │  PC #N  │                    │
│    └─────────┘          └─────────┘          └─────────┘                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Componentes del Sistema

### 2.1 Dashboard (Frontend)

| Aspecto | Decisión | Razón |
|---------|----------|-------|
| Framework | Astro + React | Ya existe, reutilizable |
| Hosting | Vercel | Ya configurado, edge functions disponibles |
| Autenticación | NextAuth.js / Auth.js | Integración fácil con Vercel |
| Estado | Zustand | Ligero, para estado de agentes conectados |
| WebSocket Client | Native WebSocket API | Sin dependencias adicionales |

**Páginas principales:**

```
/dashboard              → Vista general de agentes
/dashboard/agents       → Lista de agentes conectados
/dashboard/modules      → Catálogo de módulos disponibles
/dashboard/agent/[id]   → Detalle de un agente específico
/dashboard/deploy       → Interfaz para desplegar módulos
```

### 2.2 WebSocket Gateway

**Opción A: Vercel Edge Functions (Limitado)**
- WebSocket no soportado nativamente en Vercel serverless
- Se puede usar Vercel + servicio externo (Ably, Pusher, Socket.io)

**Opción B: Servicio dedicado (Recomendado para PoC)**
- Railway.app, Render, o Fly.io para el WebSocket server
- Node.js con `ws` library o Go con `gorilla/websocket`

**Decisión para PoC:** Usar **Render** (free tier) para un servidor WebSocket Go separado.

```
┌─────────────────────────────────────────────────────────┐
│ ARQUITECTURA HÍBRIDA                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Vercel (Frontend)          Render (WebSocket Server)   │
│  ┌─────────────────┐        ┌─────────────────┐        │
│  │ Astro Dashboard │◄──────►│ Go WS Gateway   │        │
│  │ REST API        │  HTTP  │ Agent Manager   │        │
│  └─────────────────┘        └────────┬────────┘        │
│                                      │                  │
│                                      │ WSS              │
│                                      ▼                  │
│                              ┌───────────────┐         │
│                              │   Agents      │         │
│                              └───────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Agent (Go)

**Responsabilidades:**
1. Conectar al WebSocket Gateway
2. Reportar estado del sistema (heartbeat)
3. Recibir comandos del dashboard
4. Descargar y ejecutar módulos
5. Reportar resultados de ejecución

**Estructura del binario:**

```go
// Estructura simplificada del agente
modularhub-agent/
├── main.go              // Entry point
├── config/
│   └── config.go        // Configuración (server URL, token, etc.)
├── ws/
│   └── client.go        // WebSocket client con reconnect
├── modules/
│   ├── loader.go        // Carga dinámica de módulos
│   ├── registry.go      // Módulos instalados
│   └── sandbox.go       // Ejecución sandboxed
├── system/
│   └── metrics.go       // CPU, RAM, disk, etc.
└── handlers/
    └── commands.go      // Procesar comandos del dashboard
```

**Cross-compilation targets:**

```bash
# Windows (principal para GHI Hornos)
GOOS=windows GOARCH=amd64 go build -o agent-windows.exe

# Linux (servidores, Raspberry Pi)
GOOS=linux GOARCH=amd64 go build -o agent-linux
GOOS=linux GOARCH=arm64 go build -o agent-linux-arm64

# macOS (desarrollo)
GOOS=darwin GOARCH=arm64 go build -o agent-macos
```

---

## 3. Protocolo de Comunicación

### 3.1 Mensaje Base

```json
{
  "type": "string",           // Tipo de mensaje
  "id": "uuid",               // ID único del mensaje
  "timestamp": "ISO8601",     // Timestamp
  "payload": {}               // Datos específicos del tipo
}
```

### 3.2 Tipos de Mensaje

#### Agent → Server

| Type | Descripción | Payload |
|------|-------------|---------|
| `auth` | Autenticación inicial | `{ "token": "...", "hostname": "...", "os": "..." }` |
| `heartbeat` | Latido periódico | `{ "cpu": 45, "ram": 60, "disk": 75, "modules": [...] }` |
| `module_result` | Resultado de ejecución | `{ "moduleId": "...", "success": true, "output": "..." }` |
| `log` | Log del agente | `{ "level": "info", "message": "..." }` |

#### Server → Agent

| Type | Descripción | Payload |
|------|-------------|---------|
| `auth_response` | Respuesta a auth | `{ "success": true, "agentId": "..." }` |
| `deploy_module` | Instalar módulo | `{ "moduleId": "...", "version": "...", "url": "..." }` |
| `remove_module` | Desinstalar módulo | `{ "moduleId": "..." }` |
| `execute_module` | Ejecutar módulo | `{ "moduleId": "...", "args": {...} }` |
| `execute_command` | Comando directo | `{ "command": "...", "args": [...] }` |

### 3.3 Autenticación

**Flujo de ticket-based auth:**

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│  Agent   │          │  Server  │          │ Dashboard│
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │ 1. HTTP: Request ticket                   │
     │────────────────────►│                     │
     │                     │                     │
     │ 2. Return one-time ticket                 │
     │◄────────────────────│                     │
     │                     │                     │
     │ 3. WSS Connect + ticket                   │
     │────────────────────►│                     │
     │                     │                     │
     │ 4. Validate ticket, establish session     │
     │◄───────────────────►│                     │
     │                     │                     │
     │ 5. Periodic heartbeat                     │
     │────────────────────►│ 6. Update UI        │
     │                     │────────────────────►│
```

---

## 4. Sistema de Módulos

### 4.1 Definición de Módulo

```json
{
  "id": "system-monitor",
  "name": "System Monitor",
  "version": "1.0.0",
  "description": "Monitorea CPU, RAM, disco y procesos",
  "author": "ModularHub",
  "type": "script",           // "script" | "binary" | "wasm"
  "entrypoint": "main.ps1",   // O "main.exe", "main.wasm"
  "platforms": ["windows", "linux"],
  "permissions": ["system.read"],
  "config": {
    "interval": 5000
  }
}
```

### 4.2 Tipos de Módulos

| Tipo | Formato | Sandboxing | Uso |
|------|---------|------------|-----|
| `script` | PowerShell, Bash | Limitado | Tareas simples, scripts existentes |
| `binary` | Ejecutable nativo | Proceso separado | Herramientas existentes |
| `wasm` | WebAssembly | Alto (WASI) | Módulos seguros, portables |

### 4.3 Permisos

```go
type Permission string

const (
    PermSystemRead    Permission = "system.read"     // Leer métricas
    PermSystemWrite   Permission = "system.write"    // Modificar sistema
    PermFileRead      Permission = "file.read"       // Leer archivos
    PermFileWrite     Permission = "file.write"      // Escribir archivos
    PermNetworkLocal  Permission = "network.local"   // Red local
    PermNetworkWAN    Permission = "network.wan"     // Internet
    PermProcessSpawn  Permission = "process.spawn"   // Crear procesos
)
```

### 4.4 Módulos de Ejemplo (PoC)

#### Módulo 1: System Info

```yaml
# system-info/manifest.yaml
id: system-info
name: System Info
version: 1.0.0
type: script
entrypoint: main.ps1
platforms: [windows]
permissions: [system.read]
```

```powershell
# system-info/main.ps1
$info = @{
    hostname = $env:COMPUTERNAME
    os = (Get-CimInstance Win32_OperatingSystem).Caption
    cpu = (Get-CimInstance Win32_Processor).Name
    ram_total = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
    disk_free = [math]::Round((Get-PSDrive C).Free / 1GB, 2)
}
$info | ConvertTo-Json
```

#### Módulo 2: Process List

```yaml
# process-list/manifest.yaml
id: process-list
name: Process List
version: 1.0.0
type: script
entrypoint: main.ps1
platforms: [windows]
permissions: [system.read]
```

```powershell
# process-list/main.ps1
Get-Process |
    Sort-Object CPU -Descending |
    Select-Object -First 10 Name, CPU, WorkingSet64 |
    ConvertTo-Json
```

---

## 5. Seguridad

### 5.1 Capas de Seguridad

```
┌─────────────────────────────────────────────────────────────────┐
│ CAPA 1: Transporte                                              │
│ ─────────────────                                               │
│ • WSS (TLS 1.3) para todas las comunicaciones                   │
│ • Certificados válidos (Let's Encrypt)                          │
│ • No permitir conexiones sin TLS                                │
├─────────────────────────────────────────────────────────────────┤
│ CAPA 2: Autenticación                                           │
│ ─────────────────────                                           │
│ • Token pre-compartido por agente (generado en dashboard)       │
│ • Ticket one-time para establecer WebSocket                     │
│ • Rotación periódica de tokens                                  │
├─────────────────────────────────────────────────────────────────┤
│ CAPA 3: Autorización                                            │
│ ─────────────────────                                           │
│ • Permisos por módulo (declarados en manifest)                  │
│ • Aprobación manual para permisos sensibles                     │
│ • Audit log de todas las acciones                               │
├─────────────────────────────────────────────────────────────────┤
│ CAPA 4: Ejecución                                               │
│ ─────────────────                                               │
│ • Módulos ejecutados en proceso separado                        │
│ • Timeout configurable por módulo                               │
│ • Limitar recursos (CPU, memoria) cuando sea posible            │
│ • Sandboxing con WASM para módulos no confiables                │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Modelo de Amenazas (Básico)

| Amenaza | Mitigación |
|---------|------------|
| Intercepción de tráfico | WSS obligatorio |
| Agente falso | Token único por agente, verificación en registro |
| Módulo malicioso | Permisos explícitos, revisión antes de deploy |
| DoS al servidor | Rate limiting, conexiones máximas por IP |
| Ejecución de código arbitrario | Sandboxing, lista blanca de comandos |

---

## 6. Estructura del Proyecto

```
NEW_LIFE/
├── apps/
│   └── web/                      # Dashboard (existente → modificar)
│       ├── src/
│       │   ├── pages/
│       │   │   └── dashboard/    # Nuevas páginas de dashboard
│       │   │       ├── index.astro
│       │   │       ├── agents.astro
│       │   │       └── modules.astro
│       │   ├── components/
│       │   │   └── dashboard/    # Componentes del dashboard
│       │   │       ├── AgentCard.tsx
│       │   │       ├── AgentList.tsx
│       │   │       ├── ModuleCard.tsx
│       │   │       └── DeployModal.tsx
│       │   └── lib/
│       │       ├── ws-client.ts  # WebSocket client
│       │       └── api.ts        # API calls
│       └── ...
│
├── services/
│   └── ws-gateway/               # NUEVO: WebSocket Gateway (Go)
│       ├── main.go
│       ├── go.mod
│       ├── handlers/
│       ├── models/
│       └── Dockerfile
│
├── agent/                        # NUEVO: Agent (Go)
│   ├── main.go
│   ├── go.mod
│   ├── config/
│   ├── ws/
│   ├── modules/
│   └── Makefile                  # Build para múltiples OS
│
├── modules/                      # NUEVO: Módulos de ejemplo
│   ├── system-info/
│   │   ├── manifest.yaml
│   │   └── main.ps1
│   ├── process-list/
│   │   ├── manifest.yaml
│   │   └── main.ps1
│   └── ...
│
└── docs/
    └── MODULARHUB_ARCHITECTURE.md  # Este documento
```

---

## 7. Plan de Implementación

### Fase 1: Fundamentos (MVP Mínimo)

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: Comunicación básica                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ □ 1.1 WebSocket Gateway básico (Go)                            │
│   • Aceptar conexiones WSS                                      │
│   • Autenticación simple (token fijo para PoC)                  │
│   • Broadcast a dashboard cuando agente conecta/desconecta      │
│                                                                 │
│ □ 1.2 Agent básico (Go)                                        │
│   • Conectar a gateway                                          │
│   • Enviar heartbeat cada 5 segundos                            │
│   • Reconectar automáticamente si se pierde conexión            │
│                                                                 │
│ □ 1.3 Dashboard básico (Astro/React)                           │
│   • Página /dashboard con lista de agentes                      │
│   • Indicador online/offline en tiempo real                     │
│   • Mostrar métricas básicas del heartbeat                      │
│                                                                 │
│ ENTREGABLE: Un agente que conecta y se ve en el dashboard       │
└─────────────────────────────────────────────────────────────────┘
```

### Fase 2: Sistema de Módulos

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 2: Módulos básicos                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ □ 2.1 Module Registry                                          │
│   • Catálogo de módulos en el dashboard                         │
│   • Subir módulos (scripts simples)                             │
│   • Versionado básico                                           │
│                                                                 │
│ □ 2.2 Module Loader en Agent                                   │
│   • Descargar módulo desde URL                                  │
│   • Guardar en directorio local                                 │
│   • Ejecutar script y capturar output                           │
│                                                                 │
│ □ 2.3 Deploy desde Dashboard                                   │
│   • Seleccionar agente(s)                                       │
│   • Seleccionar módulo                                          │
│   • Enviar comando deploy                                       │
│   • Ver resultado en UI                                         │
│                                                                 │
│ ENTREGABLE: Desplegar y ejecutar un script desde el dashboard   │
└─────────────────────────────────────────────────────────────────┘
```

### Fase 3: Seguridad y Producción

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 3: Hardening                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ □ 3.1 Autenticación robusta                                    │
│   • Tokens únicos por agente                                    │
│   • Rotación de tokens                                          │
│   • Dashboard login (Auth.js)                                   │
│                                                                 │
│ □ 3.2 Sistema de permisos                                      │
│   • Manifest con permisos declarados                            │
│   • Validación antes de ejecución                               │
│   • Aprobación manual para permisos sensibles                   │
│                                                                 │
│ □ 3.3 Logging y Audit                                          │
│   • Log de todas las acciones                                   │
│   • Histórico de ejecuciones                                    │
│   • Alertas de errores                                          │
│                                                                 │
│ ENTREGABLE: Sistema seguro listo para piloto                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Decisiones Técnicas Pendientes

| Decisión | Opciones | Para decidir en |
|----------|----------|-----------------|
| Base de datos para estado | SQLite embebido vs PostgreSQL | Fase 1 |
| Almacenamiento de módulos | Git repo vs S3/R2 vs local | Fase 2 |
| Sandboxing avanzado | Docker vs WASM vs ninguno | Fase 3 |
| Autenticación dashboard | Auth.js vs Clerk vs custom | Fase 3 |

---

## 9. Referencias

### Documentación
- [Go WebSocket (gorilla/websocket)](https://github.com/gorilla/websocket)
- [Astro WebSocket integration](https://docs.astro.build/)
- [Render Deploy Docs](https://render.com/docs)

### Proyectos similares (inspiración)
- [Netdata](https://github.com/netdata/netdata) - Monitoreo distribuido
- [Teleport](https://github.com/gravitational/teleport) - Acceso remoto seguro
- [Rudder](https://www.rudder.io/) - Gestión de configuración con UI

### Investigación JARVIS (2026-01-26)
- MING Stack para IIoT
- WebSocket security patterns
- Go vs Rust vs Node.js para agentes

---

## Changelog

### v1.0.0 (2026-01-26)
- Documento inicial de arquitectura
- Definición de componentes principales
- Plan de implementación en 3 fases
- Protocolos de comunicación
- Modelo de seguridad básico
