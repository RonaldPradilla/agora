# SPEC-01: Registro de Usuarios - Guía de Testing

## Prerrequisitos

1. Backend corriendo en `http://localhost:3000`
2. PostgreSQL conectado y migrado
3. Variables de entorno configuradas

## Casos de Prueba - Validación

### ✅ Caso Exitoso: Registro Válido

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario.valido@ejemplo.com",
    "password": "ContraseñaSegura123",
    "confirmPassword": "ContraseñaSegura123"
  }'
```

**Resultado esperado:** HTTP 201
```json
{
  "message": "Cuenta creada. Revisa tu correo para confirmar."
}
```

**Base de datos debe contener:**
- Nuevo registro en `usuarios` con `cuenta_activa = false`
- Token en tabla `tokens` con `tipo = 'verificacion'`
- Email almacenado como SHA-256

---

### ❌ Caso: Email Inválido

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "email-sin-arroba",
    "password": "Valida123",
    "confirmPassword": "Valida123"
  }'
```

**Resultado esperado:** HTTP 400
```json
{
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "El correo electrónico debe ser válido"
    }
  ]
}
```

---

### ❌ Caso: Email Vacío

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "",
    "password": "Valida123",
    "confirmPassword": "Valida123"
  }'
```

**Resultado esperado:** HTTP 400
```json
{
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "El correo electrónico es requerido"
    }
  ]
}
```

---

### ❌ Caso: Contraseña Muy Corta (7 caracteres)

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "Test12",
    "confirmPassword": "Test12"
  }'
```

**Resultado esperado:** HTTP 400
```json
{
  "statusCode": 400,
  "errors": [
    {
      "field": "password",
      "message": ["La contraseña debe tener al menos 8 caracteres"]
    }
  ]
}
```

---

### ✅ Caso Límite: Contraseña Exactamente 8 caracteres

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.limite@ejemplo.com",
    "password": "Test1234",
    "confirmPassword": "Test1234"
  }'
```

**Resultado esperado:** HTTP 201 ✓ (Válido)

---

### ❌ Caso: Contraseña sin Mayúscula

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "test1234567",
    "confirmPassword": "test1234567"
  }'
```

**Resultado esperado:** HTTP 400
```json
{
  "statusCode": 400,
  "errors": [
    {
      "field": "password",
      "message": ["La contraseña debe incluir al menos una mayúscula y un número"]
    }
  ]
}
```

---

### ❌ Caso: Contraseña sin Número

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "TestAbcdef",
    "confirmPassword": "TestAbcdef"
  }'
```

**Resultado esperado:** HTTP 400
```json
{
  "statusCode": 400,
  "errors": [
    {
      "field": "password",
      "message": ["La contraseña debe incluir al menos una mayúscula y un número"]
    }
  ]
}
```

---

### ❌ Caso: Contraseñas No Coinciden

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "Correcto123",
    "confirmPassword": "Incorrecto123"
  }'
```

**Resultado esperado:** HTTP 400
```json
{
  "statusCode": 400,
  "errors": [
    {
      "field": "confirmPassword",
      "message": ["Las contraseñas no coinciden"]
    }
  ]
}
```

---

### ❌ Caso: Email ya Registrado

```bash
# Primer registro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicado@ejemplo.com",
    "password": "Contraseña123",
    "confirmPassword": "Contraseña123"
  }'

# Intentar registro con mismo email (resulta en error)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicado@ejemplo.com",
    "password": "OtraContraseña123",
    "confirmPassword": "OtraContraseña123"
  }'
```

**Resultado esperado (2do intento):** HTTP 400
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

**Verificación en BD:**
```sql
SELECT email_hash, cuenta_activa FROM usuarios 
WHERE email_hash = SHA256('duplicado@ejemplo.com');
-- Debe retornar 1 fila con cuenta_activa = false
```

---

### ✅ Caso: Email con + (subaddressing)

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario+notificaciones@ejemplo.com",
    "password": "Validacion123",
    "confirmPassword": "Validacion123"
  }'
```

**Resultado esperado:** HTTP 201 ✓

---

### ✅ Caso: Email a Mayúsculas (se normaliza a minúsculas)

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "USUARIO@EJEMPLO.COM",
    "password": "Normalizacion123",
    "confirmPassword": "Normalizacion123"
  }'
```

**Resultado esperado:** HTTP 201 ✓

**Verificación:** El email se almacena normalizado como `usuario@ejemplo.com`

---

### ❌ Caso: Email Excede 255 Caracteres

```bash
EMAIL_LARGO="$(python3 -c "print('a' * 250 + '@ejemplo.com')")"

curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL_LARGO\",
    \"password\": \"Contraseña123\",
    \"confirmPassword\": \"Contraseña123\"
  }"
```

**Resultado esperado:** HTTP 400
```json
{
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "El correo electrónico no puede exceder 255 caracteres"
    }
  ]
}
```

---

### ❌ Caso: Campos Vacíos / Faltantes

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Resultado esperado:** HTTP 400
```json
{
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "El correo electrónico es requerido"
    },
    {
      "field": "password",
      "message": "La contraseña es requerida"
    },
    {
      "field": "confirmPassword",
      "message": "La confirmación de contraseña es requerida"
    }
  ]
}
```

---

### ❌ Caso: Content-Type Incorrecto

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: text/plain" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "Contraseña123",
    "confirmPassword": "Contraseña123"
  }'
```

**Resultado esperado:** HTTP 400 (Bad Request)

---

## Pruebas Específicas de Seguridad

### 1. Verificación: Email NO se almacena en texto plano

```sql
-- Conectar a PostgreSQL
SELECT id, email_hash, password_hash FROM usuarios LIMIT 1;

-- email_hash debe ser:
-- - 64 caracteres (SHA-256 hex)
-- - Diferente para cada usuario (incluso si email similar)
-- - NO debe contener el email original
```

**Script Python para verificar:**
```python
import hashlib

email = "usuario@ejemplo.com"
expected_hash = hashlib.sha256(email.encode()).hexdigest()
print(f"SHA-256: {expected_hash}")
# Debe coincidir con lo que hay en la BD
```

---

### 2. Verificación: Contraseña se hashea con bcrypt (factor 12)

```sql
-- Conectar a PostgreSQL
SELECT password_hash FROM usuarios LIMIT 1;

-- Debe comenzar con: $2b$12$ (bcrypt factor 12)
-- Debe tener ~60 caracteres
```

**Script Python para verificar:**
```python
import bcrypt

stored_hash = "$2b$12$..."  # Del valor en BD
plain_password = "ContraseñaOriginal"

# Verificar
is_valid = bcrypt.checkpw(plain_password.encode(), stored_hash.encode())
print(f"Contraseña válida: {is_valid}")
```

---

### 3. Verificación: Token JWT tiene expiración 24h

```sql
-- Conectar a PostgreSQL
SELECT expira_en FROM tokens WHERE tipo = 'verificacion' LIMIT 1;

-- expira_en debe ser ≈ ahora + 24 horas
```

**Script Python para decodificar JWT:**
```python
import jwt
import json
import base64

token = "eyJhbGc..."  # Token de la respuesta

# Sin verificar firma (solo para inspeccionar):
decoded = jwt.decode(token, options={"verify_signature": False})
print(json.dumps(decoded, indent=2))
# Debe contener: "exp": (timestamp futuro ~86400 segundos)
```

---

### 4. Verificación: Sin Inyección SQL

```bash
# Intento de SQL injection en email
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com'; DROP TABLE usuarios; --",
    "password": "Validacion123",
    "confirmPassword": "Validacion123"
  }'
```

**Resultado esperado:** HTTP 400 (formato inválido)
- La tabla `usuarios` debe seguir existiendo
- No debe ejecutarse ningún SQL malintencionado

---

## Pruebas de Correo Electrónico

### 1. Verificar Envío de Email

En los logs de la aplicación debe aparecer:
```
[NestFactory] Starting Nest application...
...
[AuthService] Usuario creado: <uuid>
[AuthService] Token de verificación creado para usuario: <uuid>
[MailService] Correo de verificación enviado a usuario@ejemplo.com
```

---

### 2. Verificar Contenido del Email

Si usas **Mailtrap:**
1. Accede a https://mailtrap.io
2. Inicia sesión
3. Busca el email en "Inbox"
4. Verifica:
   - Asunto: "Verifica tu correo electrónico en Ágora"
   - Cuerpo: Contiene enlace con formato `https://localhost:5173/verify-email?token=...`
   - HTML formateado correctamente

---

### 3. Verificar Reintentos (si SMTP falla)

```bash
# Configurar SMTP inválido temporalmente
SMTP_HOST=invalid-host.test
SMTP_PORT=9999

# Realizar registro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "reintento@ejemplo.com",
    "password": "Reintento123",
    "confirmPassword": "Reintento123"
  }'

# En logs debe aparecer:
# [MailService] Error al enviar correo a reintento@ejemplo.com: ...
# [MailService] Reintento exitoso para reintento@ejemplo.com (intento 1) [después de ~5s]
# [MailService] Reintento exitoso para reintento@ejemplo.com (intento 2) [después de ~10s]
# [MailService] Reintento exitoso para reintento@ejemplo.com (intento 3) [después de ~20s]
```

---

## Verificación de Endpoint GET /auth/verify-email

### ✅ Caso: Token Válido

1. Obtener token de verificación (desde tabla `tokens` o del email)
2. Llamar endpoint:

```bash
curl "http://localhost:3000/auth/verify-email?token=<JWT_TOKEN>"
```

**Resultado esperado:** HTTP 200
```json
{
  "message": "Correo verificado exitosamente. Ya puedes iniciar sesión."
}
```

**BD debe actualizar:**
- `tokens.usado = true`
- `usuarios.cuenta_activa = true`

---

### ❌ Caso: Token Inválido

```bash
curl "http://localhost:3000/auth/verify-email?token=invalid.jwt.token"
```

**Resultado esperado:** HTTP 400
```json
{
  "statusCode": 400,
  "message": "Token inválido o expirado"
}
```

---

### ❌ Caso: Token Expirado

1. Modificar en BD: `UPDATE tokens SET expira_en = NOW() - INTERVAL '1 day'`
2. Llamar endpoint

**Resultado esperado:** HTTP 400

---

### ❌ Caso: Token Ya Usado

1. Obtener token y llamar /verify-email (1ra vez = éxito)
2. Llamar nuevamente con mismo token

**Resultado esperado (2da llamada):** HTTP 400
```json
{
  "statusCode": 400,
  "message": "Token ya fue utilizado"
}
```

---

## Checklist de Aceptación

- [ ] POST /register con datos válidos retorna 201
- [ ] Email se almacena como SHA-256 (nunca en texto plano)
- [ ] Contraseña se hashea con bcrypt factor 12
- [ ] Token JWT generado con expiración 24h
- [ ] Token guardado en tabla `tokens`
- [ ] Email enviado con enlace de verificación
- [ ] Email duplicado rechazado con error específico
- [ ] Contraseña no coincide rechazada
- [ ] Contraseña sin mayúscula rechazada
- [ ] Contraseña sin número rechazada
- [ ] Contraseña < 8 caracteres rechazada
- [ ] Email inválido rechazado
- [ ] Email vacío rechazado
- [ ] GET /verify-email activa la cuenta
- [ ] Token expirado rechazado en verificación
- [ ] Token ya usado rechazado
- [ ] Reintentos funcionan si SMTP falla
- [ ] Error interno manejado (HTTP 500)
- [ ] Errores de validación son específicos por campo

---

## Carga de Prueba (Load Testing)

Simular múltiples registros simultáneos:

```bash
# Usar Apache Bench
ab -n 100 -c 10 -p payload.json -T application/json \
  http://localhost:3000/auth/register

# Usar wrk
wrk -t4 -c100 -d30s -s register.lua http://localhost:3000/auth/register
```

Verify no hay:
- Inyecciones de condición de carrera
- Duplicados en emails (basado en hash)
- Errores de conexión a BD

---

**Actualizado:** May 5, 2026  
**Versión:** 1.0.0
