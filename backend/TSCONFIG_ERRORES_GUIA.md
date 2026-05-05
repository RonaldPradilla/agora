# Errores Comunes con Nueva Configuración TypeScript - Guía de Resolución

## 🔴 Errores que Aparecerán Después de Actualizar tsconfig.json

### Error TS6133: Variable Declaration Not Used

```typescript
❌ ERROR:
const config = { host: 'localhost' };  // 'config' is declared but never used
startApp();

✅ SOLUCIÓN 1: Usar la variable
const config = { host: 'localhost' };
console.log('Config:', config);

✅ SOLUCIÓN 2: Remover si es innecesaria
startApp();

✅ SOLUCIÓN 3: Prefijo underscore para intencional
const _config = { host: 'localhost' };  // "Sé que no la uso"
```

**En `auth.service.ts`:** Posible variable de prueba sin usar
```typescript
// Buscar en servicios por:
const unused = ...
```

---

### Error TS6138: Parameter Not Used

```typescript
❌ ERROR:
constructor(private logger: Logger) {
  // nunca se usa 'logger'
}

✅ SOLUCIÓN 1: Usar el parámetro
constructor(private logger: Logger) {
  this.logger.log('Service initialized');
}

✅ SOLUCIÓN 2: Remover si es innecesario
constructor() {}

✅ SOLUCIÓN 3: Prefijo underscore
constructor(private _logger: Logger) {}  // Indicar que es intencional
```

**En controladores:** Posibles parámetros sin usar en métodos
```typescript
@Controller('auth')
export class AuthController {
  register(@Body() _dto: RegisterDto) {  // Asume que DTO se valida globalmente
    // Si realmente no lo usas, usar prefijo _
  }
}
```

---

### Error TS7030: Not All Code Paths Return a Value

```typescript
❌ ERROR:
function getUserStatus(id: number): string {
  if (id > 0) return 'active';
  // ¿Qué devuelve si id <= 0?
}

✅ SOLUCIÓN 1: Completar todos los caminos
function getUserStatus(id: number): string {
  if (id > 0) return 'active';
  return 'inactive';  // Ahora sí retorna en todos los casos
}

✅ SOLUCIÓN 2: Hacer la función async implícitamente undefined
function getUserStatus(id: number): string | undefined {
  if (id > 0) return 'active';
  // undefined es válido
}

✅ SOLUCIÓN 3: Throw error si es caso inválido
function getUserStatus(id: number): string {
  if (id > 0) return 'active';
  throw new Error('Invalid user ID');
}
```

**En servicios:** Revisar métodos sin retorno explícito en todas las ramas
```typescript
// auth.service.ts
async register(dto: RegisterDto) {
  try {
    // ... lógica
    return { message: '...' };
  } catch (error) {
    // ¿Qué se devuelve aquí?
    this.logger.error(error);  // ⚠️ No retorna nada - Error TS7030
  }
}

// ✅ CORRECTO
async register(dto: RegisterDto) {
  try {
    // ... lógica
    return { message: '...' };
  } catch (error) {
    this.logger.error(error);
    throw new Error('Registration failed');  // Retorna (throw)
  }
}
```

---

### Error TS7043: Possible Undefined Access (noUncheckedIndexedAccess)

```typescript
❌ ERROR:
const arr = [1, 2, 3];
const value: number = arr[100];  // arr[100] es number | undefined
console.log(value.toString());  // ¡Posible error!

✅ SOLUCIÓN 1: Guardia defensiva
const arr = [1, 2, 3];
const value = arr[100];
if (value !== undefined) {
  console.log(value.toString());
}

✅ SOLUCIÓN 2: Opcional chaining
const arr = [1, 2, 3];
console.log(arr[100]?.toString());

✅ SOLUCIÓN 3: Tipo correcto
const arr = [1, 2, 3];
const value: number | undefined = arr[100];  // Explícitamente undefined posible
```

**En DTO validators:** Acceso a array properties
```typescript
// register.dto.ts
export class RegisterDto {
  @IsEmail()
  email: string;
  
  // ⚠️ Si usas array de algo:
  roles?: string[];
}

// ❌ ERROR en service:
const firstRole = dto.roles[0];  // roles puede ser undefined

// ✅ CORRECTO:
const firstRole = dto.roles?.[0];  // undefined si roles no existe
```

---

### Error TS2552: Property Not Found (Module Resolution)

```typescript
❌ ERROR:
import { AuthService } from '@auth';  // Can't find module

✅ SOLUCIÓN 1: Usar path alias correcta
// tsconfig.json ya tiene:
"@auth/*": ["src/auth/*"]

import { AuthService } from '@auth/auth.service';  // ✅

✅ SOLUCIÓN 2: Verificar export en index.ts
// src/auth/index.ts
export { AuthService } from './auth.service';
export { AuthController } from './auth.controller';

// Ahora funciona:
import { AuthService } from '@auth';  // ✅

✅ SOLUCIÓN 3: Revisar estructura de carpetas
// Estructura correcta:
src/
  auth/
    auth.service.ts
    auth.controller.ts
    auth.module.ts
    index.ts  // ← Necesario para importar desde @auth
```

---

### Error TS4023: Exported Type Not Used (declaration)

```typescript
❌ ERROR:
// Algún tipo se exporta pero el .d.ts tiene referencia sin declaración

✅ SOLUCIÓN 1: Asegurar que types están importados
// auth-response.dto.ts
export class AuthResponseDto {  // ✅ Se exporta
  message: string;
}

// Usar en otro archivo:
import { AuthResponseDto } from '@auth/dto/auth-response.dto';

✅ SOLUCIÓN 2: Re-exportar en index.ts
// src/auth/index.ts
export { AuthResponseDto } from './dto/auth-response.dto';  // ← Agregar

// Ahora disponible:
import { AuthResponseDto } from '@auth';
```

---

## 🟡 Errores que Pueden Surgir en Archivos Específicos

### En `auth.service.ts`

```typescript
❌ POSIBLE ERROR 1: Variable sin usar
async register(registerDto: RegisterDto): Promise<{ message: string }> {
  const usuarioId = uuidv4();  // ← Generada pero posible que no se use en catch
  try {
    // ...
  } catch (error) {
    // usuarioId nunca se usa
  }
}

✅ CORRECTO:
async register(registerDto: RegisterDto): Promise<{ message: string }> {
  let usuarioId: string;
  try {
    usuarioId = uuidv4();
    // ...
  } catch (error) {
    this.logger.error(`Error para usuario ${usuarioId || 'desconocido'}`, error);
  }
}

❌ POSIBLE ERROR 2: No todos los retornos
async register(registerDto: RegisterDto): Promise<{ message: string }> {
  try {
    return { message: 'Cuenta creada' };
  } catch (error) {
    this.logger.error(error);
    // ¡Falta retorno aquí!
  }
}

✅ CORRECTO:
async register(registerDto: RegisterDto): Promise<{ message: string }> {
  try {
    return { message: 'Cuenta creada' };
  } catch (error) {
    this.logger.error(error);
    throw new InternalServerErrorException({
      message: 'Error interno. Intenta más tarde.'
    });
  }
}
```

---

### En `mail.service.ts`

```typescript
❌ POSIBLE ERROR 1: Array checking sin protección
private retryQueue: Array<...> = [];

getRetryQueue(): any[] {
  return this.retryQueue.map(item => item.options);  // ✅ OK
  // Pero si accedes a índices:
  const first = this.retryQueue[0];  // ⚠️ noUncheckedIndexedAccess
}

✅ CORRECTO:
getRetryQueue(): any[] {
  const first = this.retryQueue[0];  // ← es queue[0] | undefined
  if (first) {
    return [first];
  }
  return [];
}

❌ POSIBLE ERROR 2: setTimeout sin return
private retryWithBackoff(options: SendMailOptions, attemptNumber: number): void {
  setTimeout(async () => {  // ← void, pero setTimeout retorna number
    // ...
  }, delayMs);
  // Sin problema, pero es mejor:
}

✅ CORRECTO:
private scheduleRetry(options: SendMailOptions, attemptNumber: number): NodeJS.Timeout {
  return setTimeout(async () => {
    // ...
  }, delayMs);
}

// Ahora pueden hacer:
const timeoutId = this.scheduleRetry(options, 0);
// y cancelar si es necesario:
clearTimeout(timeoutId);
```

---

### En DTOs (register.dto.ts)

```typescript
❌ POSIBLE ERROR 1: Parámetro del validador sin usar
@ValidatorConstraint({ name: 'isPasswordsMatching' })
export class IsPasswordsMatchingConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {  // args sin usar
    const obj = args.object as any;
    return obj.password === confirmPassword;
  }
  
  defaultMessage(_args: ValidationArguments) {  // ✅ Prefijo _ porque no se usa
    return 'Las contraseñas no coinciden';
  }
}

✅ CORRECTO: Usar underscore para indicar "intencional"
validate(_confirmPassword: string, args: ValidationArguments) {
  // No necesito confirmPassword, solo valido desde args
  const obj = args.object as any;
  return obj.password === obj.confirmPassword;
}
```

---

## 🟢 Cambios Necesarios en Archivos (Guía)

### 1. En todos los servicios que lanzan excepciones:

Buscar por:
```bash
grep -r "throw new" backend/src --include="*.ts"
```

Asegurar que **todos los catch blocks** hagan `throw`:

```typescript
// ❌ MAL:
} catch (error) {
  this.logger.error(error);
  // Sin throw - no retorna
}

// ✅ BIEN:
} catch (error) {
  this.logger.error(error);
  throw new Error('...');  // O relanzar
}
```

---

### 2. En todos los métodos con condiciones:

Buscar por:
```bash
grep -r "if.*return" backend/src --include="*.ts"
```

Asegurar que:

```typescript
// ❌ MAL:
function process(data: any): string {
  if (data) return 'ok';
  // ¿Else?
}

// ✅ BIEN:
function process(data: any): string {
  if (data) return 'ok';
  return 'error';  // O throw
}
```

---

### 3. En arrays y objetos:

Asegurar protección con `?.` o guarda:

```typescript
// ❌ MAL:
const item = array[0];
console.log(item.id);

// ✅ BIEN:
const item = array?.[0];
if (item) {
  console.log(item.id);
}
```

---

## 📋 Checklist de Validación Post-Update

```bash
# 1. Compilar y capturar errores
npm run build 2>&1 | tee build-errors.log

# 2. Buscar errores específicos
grep "TS6133" build-errors.log  # Variables sin usar
grep "TS6138" build-errors.log  # Parámetros sin usar
grep "TS7030" build-errors.log  # No todos retornan

# 3. Corregir cada uno manualmente o en lote

# 4. Recompilar
npm run build

# 5. Si no hay errores:
echo "✅ TypeScript compilation exitosa!"

# 6. Ejecutar en desarrollo
npm run dev

# 7. Probar endpoint
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123","confirmPassword":"Test123"}'
```

---

## 🚀 Cómo Hacer la Migración Sin Problemas

### Opción 1: Migración Gradual (Recomendado)

```json
{
  "compilerOptions": {
    // Mantener como antes
    "noUnusedLocals": false,      // ← Aún no
    "noUnusedParameters": false,  // ← Aún no
    "noImplicitReturns": false,   // ← Aún no
    "incremental": true           // ← Esto sí
  }
}
```

Después de 1-2 semanas:
```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": false,  // ← Semana 2
    "noImplicitReturns": false,   // ← Semana 3
  }
}
```

Finalmente toda una vez:
```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Opción 2: Migración Inmediata

```bash
# 1. Actualizar tsconfig.json (ya hecho)
# 2. Compilar y capturar errores
npm run build 2>&1 | tee errors.log

# 3. Contar cuántos son
wc -l errors.log

# 4. Si < 20 errores: corregir manualmente
# 5. Si > 20 errores: usar herramientas automatizadas
```

---

## 🛠️ Herramientas Útiles

### ESLint + TypeScript Plugin

```bash
npm install --save-dev eslint @typescript-eslint/eslint-plugin

# En .eslintrc.json:
{
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-types": "warn"
  }
}
```

### Pre-commit Hook

```bash
# .husky/pre-commit
npm run build || exit 1
```

Asegura que no haya errores TS antes de hacer commit.

---

## ✅ Validación Final

Una vez actualizado, ejecutar:

```bash
# 1. Build completo
npm run build

# 2. Iniciar dev
npm run dev

# 3. Probar manualmente
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nueva@prueba.com",
    "password": "Validar123",
    "confirmPassword": "Validar123"
  }'

# Si retorna HTTP 201 ✅ Migración exitosa
```

---

**Fecha:** May 5, 2026  
**Versión:** 1.0.0  
**Aplicable a:** Node.js 18+, TypeScript 5+, NestJS 10+
