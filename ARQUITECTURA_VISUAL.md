# 🏗️ Diagrama de Arquitectura - Ágora Chat

## Flujo de Usuarios

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO FINAL                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │   FRONTEND     │
        │   React 19     │
        │   Vite         │
        │ localhost:5174 │
        └────────┬───────┘
                 │
     ┌───────────┴──────────────┬──────────────────┐
     │ HTTP                     │ WebSocket        │ 
     │ (Session Init)           │ (Streaming)      │
     │                          │                  │
     ▼                          ▼                  │
┌──────────────┐          ┌──────────────┐        │
│   POST       │          │   Socket.io  │        │
│  /api/v1/    │          │   /chat      │        │
│  chat/       │          │   namespace  │        │
│ sessions     │          └──────────────┘        │
└──────────┬───┘                │                 │
           │                    │                 │
           │ JWT Token          │ JWT in auth     │
           │ in header          │ payload         │
           │                    │                 │
           ▼                    ▼                 │
    ┌─────────────────────────────────────────┐  │
    │         BACKEND NestJS                  │  │
    │      http://localhost:3000              │  │
    └─────────────────────────────────────────┘  │
                    │                           │
        ┌───────────┼──────────────────────────┘
        │           │
        ▼           ▼
    ┌──────────┐  ┌──────────┐
    │   Auth   │  │  Chat    │
    │ Controller  │  Gateway │
    └──────────┘  └──────────┘
        │              │
        │              ├─── WsJwtGuard (validate token)
        │              │
        ├─ JwtAuthGuard (validate token on POST)
        │              │
        ▼              ▼
    ┌──────────────────────────────┐
    │    ChatService Logic         │
    │ ┌─────────────────────────┐  │
    │ │ 1. Validar usuario      │  │
    │ │ 2. Check rate limit     │  │
    │ │ 3. Detectar riesgo      │  │
    │ │ 4. Encriptar mensaje    │  │
    │ │ 5. Llamar LLM           │  │
    │ │ 6. Guardar en BD        │  │
    │ └─────────────────────────┘  │
    └──────────────────────────────┘
        │       │       │       │
        ▼       ▼       ▼       ▼
    ┌────┐ ┌────┐ ┌────┐ ┌────┐
    │RiesM│ │Cifr│ │LLM │ │Pri│
    │Service │ado   Service  sma│
    └────┘ └────┘ └────┘ └────┘
     │        │       │      │
     │        │       │      └──────┐
     │        │       │             │
     │   AES-256  OpenAI/         MySQL
     │   -GCM     Anthropic       BD:agora
     │  Encrypt   API Call       Tablas:
     │ Decrypt   Streaming       - usuarios
     │           Chunks          - chat_sesiones
     │                           - chat_mensajes
     │                           - memoria_ia
     │                           - alertas
     ▼
  Alert
 Service
   │
   └─► Crear Alerta
       (si score ≥ 0.7)
```

---

## Arquitectura de Componentes Frontend

```
┌─────────────────────────────────┐
│       App.tsx (Main)             │
│   ┌──────────────────────────┐   │
│   │   LoginForm / Register   │   │
│   │   → AuthService          │   │
│   └──────────────────────────┘   │
│           │                       │
│           ▼                       │
│   ┌──────────────────────────┐   │
│   │     Dashboard            │   │
│   │     (onLogout hook)      │   │
│   └──────────┬───────────────┘   │
│              │                    │
│              ▼                    │
│    ┌─────────────────────────┐   │
│    │   ChatWindow.tsx        │   │
│    │ ┌─────────────────────┐ │   │
│    │ │ useChat hook        │ │   │
│    │ │ - messages[]        │ │   │
│    │ │ - isTyping          │ │   │
│    │ │ - error             │ │   │
│    │ │ - sessionId         │ │   │
│    │ │ - enviarMensaje()   │ │   │
│    │ └─────────────────────┘ │   │
│    └─────────────────────────┘   │
│              │                    │
│    ┌─────────┴────────┐          │
│    │                  │          │
│    ▼                  ▼          │
│ useWebSocket()    iniciarSesionHTTP()
│  - socket.io        - axios POST
│  - connect          - /api/v1/chat/sessions
│  - on('chat:       - Bearer token
│     response')      │
│  - emit('chat:     │
│     message')      │
│                    └────────────┐
└─────────────────────────────────┘
         │                    │
         ▼                    ▼
    ┌───────────────┐    ┌──────────────┐
    │  Socket.io    │    │  Axios       │
    │  Client       │    │  HTTP Client │
    └───────────────┘    └──────────────┘
         │                    │
         └────────┬───────────┘
                  │
         HTTP/WebSocket
                  │
         Backend (NestJS)
```

---

## Flujo de Encriptación de Mensajes

```
┌────────────────────────┐
│  Mensaje Plano del     │
│  Usuario               │
│  "Estoy triste"        │
└────────────┬───────────┘
             │
             ▼
    ┌────────────────────────┐
    │ CifradoService.encrypt │
    │                        │
    │ 1. Generar IV aleatorio│
    │    (12 bytes random)   │
    │ 2. Crear cipher AES256 │
    │    -GCM con key        │
    │ 3. Cifrar mensaje      │
    │ 4. Obtener auth_tag    │
    └────────┬───────────────┘
             │
        ┌────┴────┬────────┬──────────┐
        │          │        │          │
        ▼          ▼        ▼          ▼
    encrypted     iv     auth_tag   metadata
    "a1b2c3d4"  "0123   "9876543   timestamp
               456789ab"  210"
                 │          │          │
                 └──────────┴──────────┘
                       │
                       ▼
            ┌───────────────────────┐
            │  Guardar en BD MySQL  │
            │                       │
            │ chat_mensajes:        │
            │ - id (UUID)          │
            │ - sesion_id          │
            │ - remitente (enum)   │
            │ - contenido (enc)    │
            │ - iv (hex)           │
            │ - auth_tag (hex)     │
            │ - score_riesgo       │
            │ - timestamp          │
            └───────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   Lectura del                    Seguridad
   Mensaje:                       - No reversible
   1. Obtener iv                  - Integridad
   2. Obtener auth_tag              validada
   3. Obtener contenido           - Con GCM
   4. Descifrar con key           - Resistance
   5. Retornar plaintext            a tampering
```

---

## Tabla de Decisiones del Riesgo

```
┌─────────────────────────────────────────────┐
│  DetectorRiesgoService.detect(mensaje)      │
└──────────────────┬──────────────────────────┘
                   │
            ┌──────┴──────┐
            │             │
    Palabras Clave   Palabras Clave
    ALTO RIESGO:      MEDIO RIESGO:
    (score +0.3)      (score +0.1)
    │                 │
    ├─ suicidio        ├─ depresión
    ├─ matarme         ├─ ansiedad
    ├─ morir           ├─ solo
    ├─ muerte          ├─ vacío
    ├─ no quiero       └─ sin esperanza
    │  vivir
    ├─ adiós
    └─ despedirme
    
    │                 │
    └────────┬────────┘
             │
             ▼
    ┌────────────────────┐
    │ Sumar scores       │
    │ Max = 1.0          │
    │                    │
    │ Ej: "morir" +      │
    │     "suicidio" =   │
    │     0.3 + 0.3 =    │
    │     0.6            │
    └────────┬───────────┘
             │
    ┌────────┴───────────┐
    │                    │
    ▼                    ▼
score < 0.7        score >= 0.7
│                  │
│                  └─► CREAR ALERTA
│                     estado: pendiente
│                     palabras_clave: JSON
└────► Sin alerta     score: guardado
```

---

## Flujo WebSocket Streaming

```
Cliente Frontend              Backend NestJS           LLM API
     │                              │                    │
     │─────────────────────────────►│                    │
     │   emit('chat:message')       │                    │
     │   {mensaje, sesion_id}       │                    │
     │                              │                    │
     │                    ┌─────────┴────────┐           │
     │                    │ Validar JWT      │           │
     │                    │ Check rate limit │           │
     │                    │ Detectar riesgo  │           │
     │                    │ Guardar mensaje  │           │
     │                    └─────────┬────────┘           │
     │                              │                    │
     │                              │───────────────────►│
     │                              │  POST stream request
     │                              │  {messages, model}
     │                              │                    │
     │                              │◄─────────────────┐ │
     │                              │ Response Chunk 1  │ │
     │                              │ "Hola, como..."  │ │
     │                              │                   │ │
     │◄─────────────────────────────┤                   │ │
     │ on('chat:response')          │                   │ │
     │ {chunk, is_final: false}     │                   │ │
     │                              │◄─────────────────┐ │
     │                              │ Response Chunk 2  │ │
     │                              │                   │ │
     │◄─────────────────────────────┤                   │ │
     │ on('chat:response')          │                   │ │
     │ {chunk, is_final: false}     │                   │ │
     │                              │                   │ │
     │ [REPEAT...]                  │                   │ │
     │                              │◄─────────────────┐ │
     │                              │ Final Response    │ │
     │                              │                   │ │
     │◄─────────────────────────────┤                   │ │
     │ on('chat:response')          │                   │ │
     │ {                            │ (Guardar         │ │
     │   is_final: true,            │  en BD +         │ │
     │   score_riesgo: 0.3,         │  Crear alerta    │ │
     │   timestamp                  │  si aplica)      │ │
     │ }                            └───────────────────┘ │
     │
     ├─ Acumular chunks
     ├─ Mostrar en UI
     ├─ Marcar como final
     └─ Mostrar score_riesgo
```

---

## Stack de Tecnologías

```
┌──────────────────────────────────────────────────────────┐
│                    INFRAESTRUCTURA                       │
│                                                          │
│  Windows 11 │ Node.js v24 │ npm 10 │ Git              │
└──────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  BACKEND     │    │  FRONTEND    │    │  DATABASE    │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ NestJS 11    │    │ React 19     │    │ MySQL 8      │
│ TypeScript   │    │ Vite 8       │    │ Prisma 5.22  │
│ Prisma ORM   │    │ Zustand      │    │ Migrations   │
│ Socket.io    │    │ axios        │    │ JWT relations│
│ JWT          │    │ socket.io-cl │    │              │
│ Bcrypt       │    │ react-hook-  │    │              │
│ class-valid  │    │   form       │    │              │
│ passport     │    │ TypeScript   │    │              │
│ @nestjs/jwt  │    │              │    │              │
│ crypto       │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │
        │    API HTTP        │ Queries            │
        │    + WebSocket     │ ORM                │
        └────────┬───────────┤                    │
                 │           │                    │
        ┌────────┴───────────┴────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  HERRAMIENTAS DE DESARROLLO │
├─────────────────────────────┤
│ Jest (testing)              │
│ TypeScript (type safety)    │
│ ESLint (code quality)       │
│ Prettier (formatting)       │
└─────────────────────────────┘
```

---

## Ciclo de Vida de una Sesión Chat

```
     ┌─────────────────────────────────────┐
     │   Usuario abre chat en frontend     │
     └──────────────┬──────────────────────┘
                    │
                    ▼
        ┌──────────────────────┐
        │ Cargar JWT del LS    │
        └──────────┬───────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │ POST /api/v1/chat/     │
       │ sessions               │
       │ Mensaje inicial        │
       └──────────┬─────────────┘
                  │
        ┌─────────┴───────────┐
        │                     │
        ▼                     ▼
    Error             ┌────────────────┐
    (401/429)         │ 201 Created    │
    │                 │ - sesion_id    │
    └─ Mostrar        │ - respuesta_ia │
      error en UI     │ - score_riesgo │
                      └────────┬───────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │ Conectar WebSocket │
                    │ socket.io /chat    │
                    │ auth: { token }    │
                    └────────┬───────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
              ┌──────────┐       ┌──────────┐
              │ conectado│       │ error    │
              └────┬─────┘       └──────────┘
                   │                  │
        ┌──────────┴────────┐    Mostrar error
        │                   │    en UI
        ▼                   ▼
    Enviar        Socket no se
    mensaje       conecta
    chat:message  (fallback
    emit          a HTTP)
        │
        ▼
    Servidor
    procesa
    mensaje
    │
    ├─ Detecta riesgo
    ├─ Llama LLM
    ├─ Envía chunks
    │
    ▼
    chat:response
    events (stream)
        │
        ├─ Chunk 1: "Hola,"
        ├─ Chunk 2: " cómo"
        ├─ Chunk 3: " estás?"
        │
        ▼ (is_final: true)
    Mensaje completo
    guardado en BD
    Usuario ve
    respuesta
    completa
        │
        ├─ Si score >= 0.7
        │  └─ Mostrar alerta
        │
        ▼
    Esperando
    siguiente
    mensaje
```

---

**Generado:** 5 de mayo de 2026  
**Versión:** 1.0.0 - COMPLETA
