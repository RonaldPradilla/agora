# 🚀 Quick Start Guide - Ágora Chat

**Última actualización:** 5 de mayo de 2026  
**Estado:** ✅ Totalmente Operacional

---

## ⚡ Inicio Rápido (5 minutos)

### 1️⃣ Arrancar MySQL
```bash
# Windows: Asegurar que MySQL está corriendo
Get-Process | Where-Object {$_.Name -like "*mysql*"}

# O iniciar MySQL
mysql --version
```

### 2️⃣ Arrancar Backend
```bash
cd backend
npm run dev
# Escuchar: listening on port 3000
```

### 3️⃣ Arrancar Frontend (nueva terminal)
```bash
cd frontend
npm run dev
# Escuchar: VITE v8.x.x ready in xxx ms
# Abrir: http://localhost:5174
```

### 4️⃣ Testear API
```bash
# Registrarse
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123"}'

# Usar token en chat
curl -X POST http://localhost:3000/api/v1/chat/sessions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"mensaje_inicial":"Hola, cómo estás?"}'
```

✅ **Listo para chatear!**

---

## 📁 Estructura de Directorios

```
agora/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── main.ts             # Entry point
│   │   ├── app.module.ts       # Root module
│   │   ├── auth/               # Auth controllers + services
│   │   ├── chat/               # Chat endpoint + WebSocket
│   │   ├── llm/                # LLM abstraction layer
│   │   ├── cifrado/            # Encryption service
│   │   ├── riesgo/             # Risk detection
│   │   ├── mail/               # Email service
│   │   └── common/             # Guards, filters, decorators
│   ├── prisma/
│   │   ├── schema.prisma       # DB models
│   │   └── migrations/         # Version control
│   ├── .env                    # Configuration
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React UI
│   ├── src/
│   │   ├── main.tsx            # Entry point
│   │   ├── App.tsx             # Root component
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # API clients
│   │   ├── store/              # Zustand state
│   │   └── assets/             # Images, etc
│   ├── package.json
│   └── vite.config.ts
│
├── database/                   # SQL scripts (if needed)
│
├── IMPLEMENTACION_CHAT.md      # Technical specification
├── ARQUITECTURA_VISUAL.md      # System architecture
├── PRUEBAS_CHAT.md             # Testing manual
├── README.md                   # Project overview
└── SETUP.md                    # Installation guide

```

---

## 🔧 Configuración Importante

### backend/.env
```env
# Database
DATABASE_URL=mysql://root:Admin123@localhost:3306/agora

# Server
PORT=3000

# JWT
JWT_SECRET=tu-secret-aqui
JWT_VERIFICATION_SECRET=tu-verification-secret

# LLM Configuration
LLM_PROVIDER=openai          # o 'anthropic'
LLM_API_KEY=sk-...           # Tu API key
LLM_MODEL=gpt-4-turbo        # o 'claude-3-opus'

# Encryption
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Rate Limiting
RATE_LIMIT_SESSIONS_PER_HOUR=10
RATE_LIMIT_MESSAGES_PER_MINUTE=30

# CORS
FRONTEND_URL=http://localhost:5173

# Email (para verificación)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 🔑 Variables de Entorno Críticas

| Variable | Descripción | Ejemplo |
|----------|------------|---------|
| `DATABASE_URL` | Conexión MySQL | `mysql://user:pass@localhost/agora` |
| `JWT_SECRET` | Para firmar tokens | Mín 32 caracteres random |
| `ENCRYPTION_KEY` | Para AES-256-GCM | 64 hex chars (32 bytes) |
| `LLM_API_KEY` | Credenciales API | Desde OpenAI/Anthropic |
| `LLM_PROVIDER` | Qué LLM usar | `openai` o `anthropic` |

---

## 🏗️ Migraciones de Base de Datos

### Ver estado actual
```bash
cd backend
npx prisma migrate status
```

### Crear nueva migración
```bash
npx prisma migrate dev --name descripcion_cambio
```

### Reset de BD (⚠️ Elimina datos)
```bash
npx prisma migrate reset
npx prisma db push
```

### Visualizar datos
```bash
npx prisma studio
# Abre http://localhost:5555
```

---

## 🧪 Ejecutar Tests

### Jest Tests
```bash
cd backend
npm run test
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
```

### Resultado esperado
```
PASS src/chat/chat.service.spec.ts
  ✓ debe crear sesión y responder en <10s
  ✓ debe detectar riesgo >= 0.7 y crear alerta
  ✓ debe rechazar token expirado con 401
  ✓ debe manejar timeout de LLM

Tests: 4 passed, 4 total
```

---

## 🛠️ Comandos Útiles

### Backend
```bash
npm run dev          # Start development server
npm run build        # Compile TypeScript
npm run start        # Run compiled code
npm run lint         # Check code style
npm run format       # Auto-format code
npm run test         # Run tests
```

### Frontend
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Check code style
```

### Prisma
```bash
npx prisma studio   # Open admin dashboard
npx prisma db push  # Sync schema with DB
npx prisma generate # Generate client types
```

---

## 🐛 Troubleshooting

### ❌ Error: EADDRINUSE: address already in use :::3000

```bash
# Kill all Node processes
Get-Process node | Stop-Process -Force

# Or find what's using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### ❌ Error: Cannot connect to database

```bash
# Verify MySQL is running
mysql -u root -p -e "SELECT 1"

# Check connection string in .env
cat backend/.env | grep DATABASE_URL

# Reset Prisma
cd backend
npx prisma migrate reset
```

### ❌ Error: JWT token invalid

```bash
# Generate new token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123"}'

# Copy token from response and use in Authorization header
```

### ❌ Error: WebSocket connection refused

```bash
# Check if Socket.io is running on backend
curl http://localhost:3000/socket.io/?EIO=4&transport=polling

# Check frontend .env or hardcoded URL
grep -r "localhost:3000" frontend/src/
```

### ❌ TypeScript errors after npm install

```bash
# Clean install
rm -r node_modules package-lock.json
npm install
npm run build
```

---

## 🔐 Seguridad Checklist

Antes de producción:

- [ ] Cambiar `JWT_SECRET` a valor secreto fuerte (32+ caracteres)
- [ ] Cambiar `ENCRYPTION_KEY` a valor único (64 hex chars)
- [ ] Configurar `FRONTEND_URL` correctamente para CORS
- [ ] Obtener real `LLM_API_KEY` (no placeholder)
- [ ] Configurar `SMTP_*` para email verificado
- [ ] Cambiar `DATABASE_URL` a servidor remoto
- [ ] Habilitar HTTPS/TLS en producción
- [ ] Usar secrets manager (AWS Secrets, Azure Key Vault)
- [ ] Implementar rate limiting más estricto si es necesario
- [ ] Auditar logs para acceso no autorizado

---

## 📊 Endpoints API

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Registrar usuario |
| `POST` | `/api/auth/login` | Obtener JWT token |
| `POST` | `/api/auth/logout` | Logout (invalidar token) |

### Chat
| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/v1/chat/sessions` | Iniciar sesión | JWT |
| `GET` | `/api/v1/chat/sessions` | Listar sesiones | JWT |
| `GET` | `/api/v1/chat/sessions/:id` | Obtener sesión | JWT |
| `WS` | `/chat` | WebSocket namespace | JWT |

### WebSocket Events
| Evento | Dirección | Datos |
|--------|-----------|-------|
| `connect` | Server → Client | `{ userId }` |
| `chat:message` | Client → Server | `{ sesion_id, mensaje }` |
| `chat:response` | Server → Client | `{ chunk, is_final, score_riesgo }` |
| `chat:error` | Server → Client | `{ message }` |

---

## 📖 Documentación Completa

| Archivo | Contenido |
|---------|-----------|
| `IMPLEMENTACION_CHAT.md` | Especificación técnica completa |
| `ARQUITECTURA_VISUAL.md` | Diagramas de arquitectura |
| `PRUEBAS_CHAT.md` | Manual de testing |
| `SETUP.md` | Guía de instalación inicial |
| `README.md` | Descripción general del proyecto |

---

## 🚢 Deployment

### Preparar para producción
```bash
# Backend
npm run build
npm run start

# Frontend
npm run build
# Subir dist/ a hosting
```

### Deployment sugerido
- **Backend:** Vercel, Railway, AWS EC2
- **Frontend:** Vercel, Netlify, AWS S3 + CloudFront
- **BD:** AWS RDS MySQL, Azure MySQL, DigitalOcean

---

## 📞 Contacto / Soporte

**Proyecto:** Ágora - Plataforma de soporte emocional con IA  
**Versión:** 1.0.0  
**Última actualización:** 5 de mayo de 2026

---

## ✅ Checklist Semanal

- [ ] Revisar logs de errores
- [ ] Monitorear uso de BD (disk, queries)
- [ ] Revisar alertas de riesgo detectadas
- [ ] Actualizar dependencias (npm outdated)
- [ ] Ejecutar tests antes de deploy
- [ ] Hacer backup de BD

---

**¡Éxito con Ágora Chat! 🎉**
