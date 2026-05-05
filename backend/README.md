# Ágora Backend - Especificación SPEC-01

Backend de la plataforma de apoyo emocional Ágora. Implementa el registro de usuarios con seguridad de nivel empresarial.

## Stack Tecnológico

- **Framework:** NestJS + TypeScript
- **Base de Datos:** MySQL + Prisma ORM
- **Seguridad:** bcrypt (factor 12) + SHA-256 + JWT
- **Correo:** Nodemailer (SMTP)
- **WebSockets:** Socket.io (infraestructura preparada)

## Características Principales

✅ Registro de nuevos usuarios con validación estricta  
✅ Hashing seguro de contraseñas (bcrypt factor 12)  
✅ Hashing de emails (SHA-256)  
✅ Verificación de email con JWT (24h expiry)  
✅ Manejo de errores coherente y detallado  
✅ Reintentos automáticos de correos fallidos  
✅ Validación global con class-validator  

## Instalación

### Requisitos Previos

- Node.js 18+
- PostgreSQL 12+
- npm o yarn

### Pasos de Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar archivo de configuración
cp .env.example .env

# 3. Configurar variables de entorno
# Edita .env con tus credenciales:
# - DATABASE_URL: Conexión a MySQL (mysql://root:Admin123@localhost:3306/agora)
# - JWT_VERIFICATION_SECRET: Secret para JWT (genera uno largo)
# - SMTP_*: Credenciales de servicio de email

# 4. Generar cliente de Prisma
npm run prisma:generate

# 5. Ejecutar migraciones
npm run prisma:migrate

# 6. Compilar
npm run build

# 7. Iniciar (desarrollo)
npm run dev

# 8. Iniciar (producción)
npm start
```

## Configuración de Entorno

### Variables Requeridas

```env
# Base de Datos
DATABASE_URL=mysql://root:Admin123@localhost:3306/agora

# JWT
JWT_VERIFICATION_SECRET=un_secret_muy_largo_y_aleatorio_minimo_32_caracteres
JWT_SECRET=otro_secret_muy_largo_y_aleatorio_minimo_32_caracteres

# SMTP
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=tu_usuario
SMTP_PASS=tu_contraseña

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Servicios Recomendados

**Base de Datos:**
- **Local MySQL**: Descargar desde https://dev.mysql.com/downloads/mysql/
- **Docker MySQL**: `docker-compose up -d` (ya configurado)

## API Endpoints

### POST /auth/register

Registra un nuevo usuario.

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Contraseña123",
  "confirmPassword": "Contraseña123"
}
```

**Validaciones:**
- Email: Formato válido (RFC 5322), máximo 255 caracteres
- Password: Mínimo 8 caracteres, al menos una mayúscula y un número
- ConfirmPassword: Debe coincidir exactamente con password

**Response 201 (Éxito):**
```json
{
  "message": "Cuenta creada. Revisa tu correo para confirmar."
}
```

**Response 400 (Validación):**
```json
{
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "El correo electrónico debe ser válido"
    },
    {
      "field": "password",
      "message": ["La contraseña debe tener al menos 8 caracteres"]
    }
  ]
}
```

**Response 400 (Email duplicado):**
```json
{
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "Ya está registrado"
    }
  ]
}
```

**Response 500 (Error interno):**
```json
{
  "statusCode": 500,
  "message": "Error interno. Intenta más tarde."
}
```

### GET /auth/verify-email?token=JWT_TOKEN

Verifica el correo electrónico del usuario.

**Response 200 (Éxito):**
```json
{
  "message": "Correo verificado exitosamente. Ya puedes iniciar sesión."
}
```

**Response 400 (Token inválido/expirado):**
```json
{
  "statusCode": 400,
  "message": "Token inválido o expirado"
}
```

## Pruebas con cURL

### Registrar Usuario

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "Test1234",
    "confirmPassword": "Test1234"
  }'
```

### Casos de Prueba - Validación

```bash
# Email inválido
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "Test1234",
    "confirmPassword": "Test1234"
  }'

# Contraseña sin mayúscula
```

## Chat con IA

### Endpoint HTTP

POST `/api/v1/chat/sessions`

- Requiere `Authorization: Bearer <jwt_token>`
- Permite generar la sesión inicial del chat con IA

Ejemplo de body:

```json
{
  "mensaje_inicial": "Me siento muy abrumado y necesito apoyo"
}
```

### WebSocket

Namespace: `/chat`

Conexión:

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: {
    token: localStorage.getItem('accessToken'),
  },
});
```

Eventos:

- `chat:message` (cliente → servidor)
  - `sesion_id`: string
  - `mensaje`: string
  - `timestamp`: ISO 8601

- `chat:response` (servidor → cliente)
  - `sesion_id`: string
  - `chunk`: string
  - `is_final`: boolean
  - `score_riesgo?`: number
  - `timestamp`: ISO 8601

- `chat:error` (servidor → cliente)
  - `message`: string

### Respuestas de error relevantes

| Código | Situación | Respuesta |
|--------|-----------|-----------|
| 400 | Mensaje inválido | `{ message: "Mensaje inválido" }` |
| 401 | Token inválido/expirado | `{ message: "Token inválido o expirado. Por favor inicia sesión." }` |
| 403 | Cuenta inactiva | `{ message: "Debes confirmar tu email para acceder al chat." }` |
| 429 | Rate limit excedido | `{ message: "Has alcanzado el límite de sesiones. Espera 1 hora." }` |
| 503 | LLM no disponible | `{ message: "El asistente no está disponible. Intenta en unos minutos." }` |

curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "test1234",
    "confirmPassword": "test1234"
  }'

# Contraseña sin número
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "TestAbcd",
    "confirmPassword": "TestAbcd"
  }'

# Contraseña muy corta
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "Test1",
    "confirmPassword": "Test1"
  }'

# Contraseñas no coinciden
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "Test1234",
    "confirmPassword": "Different1"
  }'
```

## Pruebas con Postman

1. **Importar Collection:** Usa los ejemplos de cURL anteriores
2. **Environment Variables:**
   - `base_url` = `http://localhost:3000`
   - `email` = `{{$randomEmail}}`

## Estructura del Proyecto

```
src/
├── auth/
│   ├── dto/
│   │   ├── register.dto.ts
│   │   ├── login.dto.ts
│   │   └── auth-response.dto.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── mail/
│   ├── mail.service.ts
│   └── mail.module.ts
├── prisma/
│   └── prisma.service.ts
├── common/
│   ├── exceptions/
│   │   ├── validation.filter.ts
│   │   └── all-exceptions.filter.ts
│   └── decorators/
├── app.module.ts
└── main.ts

prisma/
├── schema.prisma
└── migrations/
```

## Modelo de Base de Datos

### Tabla: usuarios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| email_hash | VARCHAR(255) | Hash SHA-256 del email (UNIQUE) |
| password_hash | VARCHAR(255) | Hash bcrypt de la contraseña |
| cuenta_activa | BOOLEAN | Verificado por email |
| fecha_registro | TIMESTAMP | Momento del registro |

### Tabla: tokens

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| token | VARCHAR | JWT de verificación |
| tipo | VARCHAR | 'verificacion' o 'acceso' |
| usuario_ID | UUID | Referencia a usuario |
| expira_en | TIMESTAMP | Fecha de expiración |
| usado | BOOLEAN | Si ya fue utilizado |

## Seguridad

### Implementado

✅ **Hashing de Contraseñas:** bcrypt con factor 12  
✅ **Hashing de Email:** SHA-256  
✅ **Validación de Entrada:** class-validator + transformación  
✅ **Secretos en Entorno:** Todas las claves en .env  
✅ **Prevención SQL Injection:** Prisma ORM  
✅ **JWT con Expiración:** 24h para verificación  
✅ **Control de Acceso:** Tokens únicos por usuario  

### Recomendaciones Adicionales

🔒 **Producción:**
- Usar HTTPS/TLS
- Implementar rate limiting (express-rate-limit)
- Usar helmet para headers de seguridad
- Configurar CORS adecuadamente
- Monitoreo de logs y alertas
- Backup automático de base de datos

## Flujo de Registro

```
1. Cliente envía: email, password, confirmPassword
2. ↓ Validar formato y reglas
3. ↓ Calcular email_hash = SHA-256(email)
4. ↓ Verificar unicidad en BD
5. ↓ Hash de contraseña: bcrypt(password, 12)
6. ↓ Crear usuario (cuenta_activa = false)
7. ↓ Generar JWT token (exp: 24h)
8. ↓ Guardar token en BD
9. ↓ Enviar email con enlace de verificación
10. → Retornar 201 + mensaje
```

## Solución de Problemas

### "SMTP_HOST no configurado"

**Problema:** El servicio de email está en modo test (consola).

**Solución:** Configura variables SMTP_* en .env

### Error: "connection refused" a PostgreSQL

**Problema:** PostgreSQL no está corriendo.

**Solución:** 
```bash
# Windows
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start

# macOS/Linux
brew services start postgresql
```

### Error: "prisma migrate"

**Problema:** No hay conexión a BD.

**Solución:**
```bash
# Verificar DATABASE_URL
echo $DATABASE_URL  # Unix
echo %DATABASE_URL%  # Windows

# Crear BD si no existe
createdb agora_dev  # Unix
createdb -h localhost -U postgres agora_dev
```

## Contacto y Soporte

Para dudas sobre la especificación o problemas durante la implementación, consulta SPEC-01.md

---

**Versión:** 1.0.0  
**Última actualización:** May 5, 2026  
**Stack:** NestJS + PostgreSQL + Prisma + JWT
