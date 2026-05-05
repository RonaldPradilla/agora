# SPEC-01: Registro de Usuarios - Especificación de Implementación

**Versión:** 1.0.0  
**Fecha:** May 5, 2026  
**Estado:** ✅ Completado

---

## Resumen Ejecutivo

Se ha implementado el endpoint de registro `POST /auth/register` para la plataforma **Ágora**, siguiendo todas las especificaciones técnicas y de seguridad requeridas. La solución utiliza NestJS, PostgreSQL con Prisma, y bcrypt/SHA-256 para seguridad de nivel empresarial.

---

## Stack Implementado

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | NestJS | 10.3.3 |
| Lenguaje | TypeScript | 5.3.3 |
| Base de Datos | MySQL | 8.0+ |
| ORM | Prisma | 5.7.1 |
| Seguridad | bcrypt | 6.0.0 |
| JWT | @nestjs/jwt | 11.0.2 |
| Validación | class-validator | 0.14.1 |
| Correo | Nodemailer | 6.9.7 |

---

## Requerimientos Implementados

### 1. ✅ Validación de Entrada

**Email:**
- Formato válido según RFC 5322 (`@IsEmail()`)
- No vacío (`@IsNotEmpty()`)
- Máximo 255 caracteres (`@MaxLength(255)`)
- Normalización a minúsculas (`@Transform`)

**Password:**
- Mínimo 8 caracteres (`@MinLength(8)`)
- Al menos una mayúscula y un número (`@Matches(/(?=.*[A-Z])(?=.*\d)/)`)

**ConfirmPassword:**
- Validación personalizada (`IsPasswordsMatchingConstraint`)
- Debe coincidir exactamente con `password`

**Respuesta (HTTP 400):**
```json
{
  "statusCode": 400,
  "errors": [
    { "field": "email", "message": "El correo electrónico debe ser válido" },
    { "field": "password", "message": ["La contraseña debe tener al menos 8 caracteres"] }
  ]
}
```

### 2. ✅ Verificación de Unicidad

**Proceso:**
1. Calcular `email_hash = SHA-256(email)`
2. Consultar `Usuario` donde `email_hash` coincida
3. Si existe → HTTP 400 con `"Ya está registrado"`
4. Independiente de `cuenta_activa`

**Respuesta (HTTP 400 - Duplicado):**
```json
{
  "statusCode": 400,
  "errors": [{ "field": "email", "message": "Ya está registrado" }]
}
```

### 3. ✅ Generación de Hashes

**UUID v4 para usuario:**
```typescript
const usuarioId = uuidv4();  // e.g., "550e8400-e29b-41d4-a716-446655440000"
```

**Email Hash (SHA-256):**
```typescript
const emailHash = crypto
  .createHash('sha256')
  .update(email)
  .digest('hex');  // 64 caracteres hex
```

**Password Hash (bcrypt factor 12):**
```typescript
const passwordHash = await bcrypt.hash(password, 12);  // $2b$12$...
```

### 4. ✅ Creación de Usuario

**Tabla: usuarios**
```sql
INSERT INTO usuarios (
  id,
  email_hash,
  password_hash,
  cuenta_activa,
  fecha_registro
) VALUES (?, ?, ?, false, NOW());
```

**Estado:** `cuenta_activa = false` hasta verificación de email

### 5. ✅ Token de Verificación

**JWT Payload:**
```typescript
{
  sub: usuarioId,
  type: 'verificacion',
  iat: timestamp,
  exp: timestamp + 86400  // +24h
}
```

**Firma:**
```typescript
this.jwtService.sign(payload, {
  secret: process.env.JWT_VERIFICATION_SECRET,
  expiresIn: '24h'
});
```

### 6. ✅ Almacenamiento de Token

**Tabla: tokens**
```sql
INSERT INTO tokens (
  id,
  token,
  tipo,
  usuario_ID,
  expira_en,
  usado
) VALUES (?, ?, 'verificacion', ?, NOW() + INTERVAL '24 hours', false);
```

### 7. ✅ Envío de Correo

**Servicio:** Nodemailer (configurable SMTP)

**Contenido:**
- Asunto: "Verifica tu correo electrónico en Ágora"
- Cuerpo: HTML formateado con enlace `{FRONTEND_URL}/verify-email?token={JWT}`
- De: Configurable en `SMTP_FROM`

**Manejo de Fallos:**
- Si SMTP falla → registra error y encola reintentos
- Reintentos con backoff exponencial: 5s, 10s, 20s
- Máximo 3 reintentos antes de log permanente
- Registro se completa exitosamente (HTTP 201)

### 8. ✅ Respuesta Exitosa

**HTTP 201 Created:**
```json
{
  "message": "Cuenta creada. Revisa tu correo para confirmar."
}
```

**Nota:** No se expone información sensible (token, password, email original)

### 9. ✅ Manejo de Errores

**HTTP 500 - Error Interno:**
```json
{
  "statusCode": 500,
  "message": "Error interno. Intenta más tarde."
}
```

**Logging:** Todos los errores se registran en logs del servidor

---

## Estructuras de Datos

### Modelo: Usuario

```typescript
model Usuario {
  id              String   @id @default(uuid())
  email_hash      String   @unique
  password_hash   String
  cuenta_activa   Boolean  @default(false)
  fecha_registro  DateTime @default(now())
  
  tokens          Token[]
  sesiones        Sesion[]
  metas           MetaAceptada[]
}
```

### Modelo: Token

```typescript
model Token {
  id         String   @id @default(uuid())
  token      String   @unique
  tipo       String
  usuario_ID String
  expira_en  DateTime
  usado      Boolean  @default(false)
  creado_en  DateTime @default(now())
  
  usuario    Usuario  @relation(fields: [usuario_ID], references: [id], onDelete: Cascade)
}
```

---

## Estructura del Proyecto

```
backend/
├── src/
│   ├── auth/
│   │   ├── dto/
│   │   │   ├── register.dto.ts         # Validaciones de registro
│   │   │   ├── login.dto.ts            # (Futuro) Login
│   │   │   └── auth-response.dto.ts    # Respuesta genérica
│   │   ├── auth.controller.ts          # Endpoints
│   │   ├── auth.service.ts             # Lógica de negocio
│   │   ├── auth.module.ts              # Módulo
│   │   └── index.ts                    # Barrel export
│   ├── mail/
│   │   ├── mail.service.ts             # Nodemailer + reintentos
│   │   ├── mail.module.ts              # Módulo
│   │   └── index.ts                    # Barrel export
│   ├── prisma/
│   │   ├── prisma.service.ts           # Cliente Prisma
│   │   └── index.ts                    # Barrel export
│   ├── common/
│   │   ├── exceptions/
│   │   │   ├── validation.filter.ts    # Filtro de validación
│   │   │   └── all-exceptions.filter.ts # Filtro global
│   │   └── decorators/                 # (Extensibles)
│   ├── app.module.ts                   # Módulo raíz
│   └── main.ts                         # Entry point
├── prisma/
│   ├── schema.prisma                   # Definición de modelos
│   ├── migrations/
│   │   └── init/migration.sql          # Migración inicial
│   └── .env                            # Env de Prisma
├── .env.example                        # Template de variables
├── .env.development                    # Desarrollo detallado
├── docker-compose.yml                  # PostgreSQL containerizado
├── tsconfig.json                       # Configuración TypeScript
├── package.json                        # Dependencias
├── README.md                           # Documentación principal
├── SETUP.md                            # Guía de instalación
├── TESTING.md                          # Casos de prueba
├── SPEC-01.md                          # Este archivo
└── Agora_SPEC-01.postman_collection.json # Collection Postman
```

---

## DTOs y Validación

### RegisterDto

```typescript
export class RegisterDto {
  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @MaxLength(255, { message: 'El correo electrónico no puede exceder 255 caracteres' })
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe incluir al menos una mayúscula y un número',
  })
  password: string;

  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  @Validate(IsPasswordsMatchingConstraint)
  confirmPassword: string;
}
```

### Validador Personalizado: IsPasswordsMatchingConstraint

```typescript
@ValidatorConstraint({ name: 'isPasswordsMatching', async: false })
export class IsPasswordsMatchingConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const obj = args.object as any;
    return obj.password === confirmPassword;
  }

  defaultMessage() {
    return 'Las contraseñas no coinciden';
  }
}
```

---

## Servicios Principales

### AuthService - Métodos Clave

**`register(registerDto: RegisterDto): Promise<{ message: string }>`**
1. Validar email no duplicado (SHA-256 hash)
2. Generar UUID v4
3. Hashear contraseña (bcrypt, factor 12)
4. Crear usuario en BD (`cuenta_activa = false`)
5. Generar JWT token (24h expiry)
6. Guardar token en tabla `tokens`
7. Enviar correo de verificación
8. Retornar HTTP 201 con mensaje

**`verifyEmail(token: string): Promise<{ message: string }>`**
1. Decodificar y verificar JWT
2. Buscar token en BD
3. Verificar no expirado y no usado
4. Marcar como usado
5. Activar cuenta (`cuenta_activa = true`)
6. Retornar HTTP 200

### MailService - Método Clave

**`sendVerificationEmail(email: string, token: string, frontendUrl: string): Promise<void>`**
1. Construir enlace: `{frontendUrl}/verify-email?token={token}`
2. Generar HTML del correo
3. Enviar vía Nodemailer
4. Si falla → encolar reintentos con backoff exponencial
5. No lanzar excepción (permite completar registro)

---

## Flujo de Registro Detallado

```
┌─────────────────────────────────────────────────────────┐
│ Cliente: POST /auth/register                            │
│ Body: { email, password, confirmPassword }              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Validar entrada (class-validator)                    │
│    - Email: formato RFC 5322                            │
│    - Password: 8+ chars, 1+ mayús, 1+ número           │
│    - ConfirmPassword: coincide exactamente              │
└────────────────────┬────────────────────────────────────┘
                     │
           (¿Validación falló?)
           │              │
      (Sí) ▼              │ (No)
    HTTP 400              ▼
    + errors        ┌──────────────────────────────────┐
                    │ 2. Calcular SHA-256(email)       │
                    │    emailHash = "abc123..."       │
                    └────────────────┬─────────────────┘
                                     │
                                     ▼
                    ┌──────────────────────────────────┐
                    │ 3. Verificar unicidad             │
                    │    SELECT * WHERE email_hash=?   │
                    └────────────────┬─────────────────┘
                                     │
                (¿Email existe?)
                │              │
           (Sí) ▼              │ (No)
         HTTP 400              ▼
         "Ya está        ┌──────────────────────────────┐
          registrado"    │ 4. Generar UUID v4           │
                         │    usuarioId = uuid()        │
                         └────────────────┬─────────────┘
                                          │
                                          ▼
                         ┌──────────────────────────────┐
                         │ 5. Hashear contraseña        │
                         │    bcrypt(password, 12)      │
                         │    passwordHash = "$2b$12..."│
                         └────────────────┬─────────────┘
                                          │
                                          ▼
                         ┌──────────────────────────────┐
                         │ 6. Crear usuario en BD       │
                         │    INSERT usuarios {         │
                         │      id,                     │
                         │      email_hash,             │
                         │      password_hash,          │
                         │      cuenta_activa: false    │
                         │    }                         │
                         └────────────────┬─────────────┘
                                          │
                                          ▼
                         ┌──────────────────────────────┐
                         │ 7. Generar JWT token         │
                         │    payload {                 │
                         │      sub: usuarioId,         │
                         │      type: 'verificacion'    │
                         │    }                         │
                         │    sign(payload, secret, 24h)│
                         └────────────────┬─────────────┘
                                          │
                                          ▼
                         ┌──────────────────────────────┐
                         │ 8. Guardar token en BD       │
                         │    INSERT tokens {           │
                         │      token,                  │
                         │      tipo: 'verificacion',   │
                         │      usuario_ID,             │
                         │      expira_en: +24h,        │
                         │      usado: false            │
                         │    }                         │
                         └────────────────┬─────────────┘
                                          │
                                          ▼
                         ┌──────────────────────────────┐
                         │ 9. Enviar correo             │
                         │    MailService.send(         │
                         │      email,                  │
                         │      token,                  │
                         │      frontendUrl             │
                         │    )                         │
                         └────────────────┬─────────────┘
                                          │
                          (¿SMTP falló?)
                          │            │
                      (Sí) ▼            │ (No)
                    Encolar reintento   │
                    Backoff exponencial │
                    Pero continuar...   │
                                        ▼
                         ┌──────────────────────────────┐
                         │ 10. HTTP 201 Created         │
                         │ {                            │
                         │   message: "Revisa correo"   │
                         │ }                            │
                         └──────────────────────────────┘
```

---

## Seguridad Implementada

### ✅ Hashing de Contraseña
- **Algoritmo:** bcrypt
- **Factor:** 12
- **Nunca en texto plano:** Se hashea antes de almacenar

### ✅ Hashing de Email
- **Algoritmo:** SHA-256
- **Uso:** Verificación de unicidad sin almacenar email original
- **Hash completo:** 64 caracteres hexadecimales

### ✅ JWT con Expiración
- **Tipo:** HS256 (HMAC-SHA256)
- **Payload:** `{ sub, type }`
- **Expiración:** 24h
- **Secret:** Configurable en entorno

### ✅ Validación de Entrada
- **Class-validator:** Validación declarativa
- **Class-transformer:** Transformación de datos
- **Whitelist:** Solo campos permitidos

### ✅ Prevención de SQL Injection
- **ORM:** Prisma previene automáticamente
- **Queries parametrizadas:** Siempre

### ✅ Secretos en Entorno
- Nunca en código
- `.env` en `.gitignore`
- `.env.example` con placeholders

### ✅ Error Handling Seguro
- Sin exponer detalles internos en 500
- Mensajes específicos para validación
- Logging en servidor

---

## Casos de Prueba Incluidos

Ver [TESTING.md](./TESTING.md) para 20+ casos de prueba cubriendo:

✅ Registro exitoso  
✅ Email inválido  
✅ Contraseña insuficiente  
✅ Contraseña sin mayúscula  
✅ Contraseña sin número  
✅ Contraseñas no coinciden  
✅ Email duplicado  
✅ Email con +  
✅ Email normalización  
✅ Email muy largo  
✅ Verificación de hashing  
✅ Verificación de JWT  
✅ Reintentos de correo  
✅ ... y más

---

## Instrucciones de Uso

### Instalación Rápida

```bash
# 1. Dependencias
npm install

# 2. Generar cliente Prisma
npm run prisma:generate

# 3. Migraciones
npm run prisma:migrate

# 4. Desarrollo
npm run dev
```

### Con Docker

```bash
# PostgreSQL
docker-compose up -d

# Backend
npm install && npm run prisma:migrate && npm run dev
```

### Probar Endpoint

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "Segura123",
    "confirmPassword": "Segura123"
  }'
```

---

## Criterios de Aceptación - Estado Final

| Criterio | Estado | Verificación |
|----------|--------|--------------|
| Registro crea usuario en `usuarios` con `cuenta_activa=false` | ✅ | SQL query |
| Email almacenado como SHA-256 | ✅ | 64 hex chars |
| Contraseña almacenada con bcrypt factor 12 | ✅ | Hash comienza con `$2b$12$` |
| JWT generado y guardado en `tokens` | ✅ | SELECT tokens |
| Correo enviado con enlace verificación | ✅ | Mailtrap inbox |
| Email duplicado rechazado (HTTP 400) | ✅ | Test TESTING.md |
| Contraseñas no coinciden rechazadas | ✅ | Test TESTING.md |
| Contraseña sin mayúscula rechazada | ✅ | Test TESTING.md |
| Contraseña sin número rechazada | ✅ | Test TESTING.md |
| Contraseña < 8 chars rechazada | ✅ | Test TESTING.md |
| Email inválido rechazado | ✅ | Test TESTING.md |
| Email vacío rechazado | ✅ | Test TESTING.md |
| GET /verify-email activa cuenta | ✅ | Endpoint implementado |
| Token expirado rechazado | ✅ | Verificación JWT |
| Token ya usado rechazado | ✅ | Flag en BD |
| Reintentos SMTP funcionan | ✅ | Backoff exponencial |
| Error interno maneja (HTTP 500) | ✅ | Filter global |
| Errores validación específicos | ✅ | Por field |

---

## Próximas Fases (Recomendadas)

1. **Rate Limiting:** Proteger /register del brute force
2. **CORS:** Configuración segura para frontend
3. **Logging:** Integrar Winston o Pino
4. **Monitoring:** Alertas sobre fallos SMTP
5. **E2E Tests:** Cypress desde frontend
6. **Login/Session:** POST /auth/login con refresh tokens
7. **2FA:** Autenticación de dos factores

---

## Referencias

- [NestJS Docs](https://docs.nestjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [class-validator](https://github.com/typestack/class-validator)
- [bcrypt Security](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)

---

**Implementación completada:** May 5, 2026  
**Última revisión:** May 5, 2026  
**Responsable:** Full-Stack Developer (GitHub Copilot)

---

## Contacto

Para dudas o recomendaciones sobre esta implementación, consultar la documentación incluida:
- README.md - Overview
- SETUP.md - Instalación
- TESTING.md - Casos de prueba
- Este archivo - Especificación técnica
