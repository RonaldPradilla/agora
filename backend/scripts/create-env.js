#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Crear .env en la raíz del backend si no existe
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  const envContent = `# Base de datos PostgreSQL
DATABASE_URL=postgresql://usuario:password@localhost:5432/agora_dev

# Puerto del servidor
PORT=3000

# JWT
JWT_VERIFICATION_SECRET=tu_secret_verificacion_muy_largo_y_aleatorio_12345
JWT_SECRET=tu_secret_acceso_muy_largo_y_aleatorio_67890

# SMTP (Email)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=tu_usuario_mailtrap
SMTP_PASS=tu_contraseña_mailtrap
SMTP_FROM=noreply@agora.com

# URLs
FRONTEND_URL=http://localhost:5173

# Entorno
NODE_ENV=development
`;
  fs.writeFileSync(envPath, envContent);
  console.log('.env creado exitosamente');
}
