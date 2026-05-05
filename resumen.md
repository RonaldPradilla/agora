# Resumen de errores encontrados y corregidos — SPEC-02

## Críticos (rompían funcionalidad)

| # | Archivo | Error | Fix |
|---|---------|-------|-----|
| 1 | `frontend/src/store/chatStore.ts` | `updateLastMessage` **reemplazaba** el contenido con cada chunk en vez de acumularlo → el streaming solo mostraba el último fragmento | Cambiar `contenido: content` → `contenido: last.contenido + chunk` |
| 2 | `frontend/src/hooks/useWebSocket.ts` | **Bucle infinito de reconexión**: `disconnect` dependía de `socket`, `useEffect` dependía de `disconnect` → cada nueva conexión causaba reconexión inmediata | Refactorizar `useEffect` para abrir/cerrar el socket directamente dentro del efecto con deps `[]` |
| 3 | `frontend/vite.config.ts` | Proxy de Vite hacía `rewrite` que **eliminaba `/api`** antes de enviar al backend → backend recibía `/auth/login` pero espera `/api/auth/login` | Eliminar la línea `rewrite` del proxy |

## Significativos (rompían integración específica)

| # | Archivo | Error | Fix |
|---|---------|-------|-----|
| 4 | `backend/src/llm/providers/anthropic.provider.ts` | Usaba **formato antiguo de completions** (`"SYSTEM: ...\nUSER: ..."`) y cabecera `Authorization: Bearer` → incompatible con Anthropic Messages API | Usar `x-api-key` + `anthropic-version: 2023-06-01`, body `{ system, messages: [{role, content}] }`, respuesta desde `body.content[0].text` |
| 5 | `frontend/src/hooks/useWebSocket.ts` | URL del WebSocket **hardcodeada** como `http://localhost:3000` | Leer `VITE_WS_URL` del entorno con fallback a `localhost:3000` |

## Menores

| # | Archivo | Error | Fix |
|---|---------|-------|-----|
| 6 | `backend/package.json` | `dotenv` usado en `main.ts` con `require('dotenv').config()` pero **no declarado** en `dependencies` | Añadir `"dotenv": "^16.0.0"` |
| 7 | `frontend/src/hooks/useChat.ts` | `setTyping` faltaba en los arrays de dependencias de `useEffect` y `useCallback` → advertencias de ESLint y posibles closures stale | Añadir `setTyping` a ambos arrays |

## Hallazgos sin corrección (no rompen funcionalidad)

- **`schema.prisma` usa MySQL** pero el spec dice PostgreSQL — consistente con las migraciones existentes y `.env.example`, se dejó igual.
- **`@nestjs/passport` y `passport`** están en `package.json` pero no se usan (guards implementados manualmente).
- **Doble detección de riesgo** en `chat.service.ts`: `detectarMensaje` + `evaluarMensaje` llaman a `detect()` dos veces para el mensaje inicial — ineficiencia menor, no un bug.
