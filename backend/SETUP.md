# Setup Guide - Ágora Backend

## Opción 1: Setup Rápido con Docker Compose

```bash
# Iniciar MySQL en un contenedor
docker-compose up -d

# Verificar que el contenedor está corriendo
docker-compose ps

# Ver logs
docker-compose logs mysql
```

MySQL estará disponible en:
- Host: `localhost`
- Puerto: `3306`
- Usuario: `root`
- Contraseña: `Admin123`
- BD: `agora`

---

## Opción 2: MySQL Local

### Windows

1. **Descargar MySQL** desde https://dev.mysql.com/downloads/mysql/
2. **Instalar** MySQLServer y MySQL Workbench
3. **Crear base de datos:**

```bash
# Abrir MySQL Command Line Client
mysql -u root -p

# Dentro de MySQL:
CREATE DATABASE agora;
```

4. **Configurar .env:**

```env
DATABASE_URL="mysql://root:Admin123@localhost:3306/agora"
```

---

### macOS

```bash
# Instalar con Homebrew
brew install mysql

# Iniciar servicio
brew services start mysql

# Crear BD
mysql -u root -e "CREATE DATABASE agora;"
```

---

### Linux (Ubuntu/Debian)

```bash
# Instalar
sudo apt update
sudo apt install mysql-server

# Iniciar servicio
sudo systemctl start mysql

# Crear BD
mysql -u root -p -e "CREATE DATABASE agora;"
```

---

## Configuración del Backend

1. **Copiar variables de entorno:**

```bash
cp .env.example .env
```

2. **Editar .env** con tus valores:
   - `DATABASE_URL`: Actualizar si cambiaste credenciales
   - `JWT_VERIFICATION_SECRET`: Generar uno nuevo
   - `JWT_SECRET`: Generar uno nuevo
   - `SMTP_*`: Configurar servicio de email

3. **Generar secretos seguros:**

```bash
# Linux/macOS
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([guid]::NewGuid()))
```

4. **Instalar dependencias:**

```bash
npm install
```

5. **Generar cliente Prisma:**

```bash
npm run prisma:generate
```

6. **Ejecutar migraciones:**

```bash
npm run prisma:migrate
```

Responde `agora_dev_init` o presiona Enter para continuar.

7. **Compilar (opcional):**

```bash
npm run build
```

8. **Iniciar en desarrollo:**

```bash
npm run dev
```

Deberías ver:

```
[Nest] 12345   - 05/05/2026, 10:15:30 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345   - 05/05/2026, 10:15:30 AM     LOG [Bootstrap] Aplicación escuchando en puerto 3000
```

---

## Configuración del Correo (SMTP)

### Mailtrap (Recomendado para desarrollo)

1. Ir a https://mailtrap.io
2. Crear cuenta (gratis)
3. Clic en "Integration"
4. Seleccionar "NodeJS"
5. Copiar credenciales y poner en .env:

```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=<username desde Mailtrap>
SMTP_PASS=<password desde Mailtrap>
```

6. Probar:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@mailtrap.io",
    "password": "Test1234",
    "confirmPassword": "Test1234"
  }'
```

7. Verificar email en dashboard de Mailtrap

---

### Ethereal (Temporal)

1. Ir a https://ethereal.email/create
2. Clic en "Create Ethereal Account"
3. Copiar "SMTP Credentials"
4. Poner en .env

Cada cuenta es temporal (~5 horas)

---

## Verificar la Instalación

```bash
# 1. Verificar conectividad a BD
psql postgresql://agora_user:agora_secure_password_123@localhost:5432/agora_dev -c "\dt"

# Debe mostrar las tablas: usuarios, tokens, sesiones, metas_aceptadas

# 2. Probar endpoint
curl http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "verificar@ejemplo.com",
    "password": "Verificar123",
    "confirmPassword": "Verificar123"
  }'

# Debe retornar 201
```

---

## Troubleshooting

### Error: "connect ECONNREFUSED 127.0.0.1:5432"

PostgreSQL no está corriendo:

```bash
# Windows
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start

# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# O usar Docker
docker-compose up -d
```

---

### Error: "database agora_dev does not exist"

Crear la base de datos:

```bash
# Windows/Linux
createdb agora_dev

# macOS
createdb agora_dev

# O desde el cliente postgres
psql -U agora_user -c "CREATE DATABASE agora_dev;"
```

---

### Error: "role agora_user does not exist"

Crear el usuario:

```bash
createuser agora_user
psql -c "ALTER USER agora_user WITH PASSWORD 'agora_secure_password_123';"
```

---

### Error: "Migration failed"

Resetear BD (⚠️ borra todos los datos):

```bash
# Eliminar BD
dropdb agora_dev

# Crearla nuevamente
createdb agora_dev

# Ejecutar migraciones
npm run prisma:migrate
```

---

### SMTP: Email no se envía

1. Verificar credenciales en .env
2. Ver logs en consola: `[MailService]`
3. Probar con Mailtrap primero (sandbox seguro)
4. Verificar firewall/antivirus no bloquee puerto SMTP

---

## Próximos Pasos

1. **Verificación de Email:** Implementar endpoint GET /verify-email
2. **Login:** Implementar POST /auth/login
3. **Refresh Tokens:** Renovación automática de sesiones
4. **Rate Limiting:** Proteger contra brute force
5. **Logs y Monitoreo:** Integrar Winston o similar
6. **CORS:** Configurar para frontend
7. **Tests:** E2E tests con Cypress

---

**Versión:** 1.0.0  
**Última actualización:** May 5, 2026
