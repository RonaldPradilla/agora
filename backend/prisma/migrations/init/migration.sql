-- CreateEnum en MySQL no existe, así que usamos ENUM directamente en la tabla
-- Por ahora omitimos la creación del TYPE

-- CreateTable "usuarios"
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `email_hash` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `cuenta_activa` BOOLEAN NOT NULL DEFAULT false,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex on email_hash (UNIQUE)
CREATE UNIQUE INDEX `usuarios_email_hash_key` ON `usuarios`(`email_hash`);

-- CreateTable "tokens"
CREATE TABLE `tokens` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `usuario_ID` VARCHAR(191) NOT NULL,
    `expira_en` DATETIME(3) NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT false,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex on token (UNIQUE)
CREATE UNIQUE INDEX `tokens_token_key` ON `tokens`(`token`);

-- CreateTable "sesiones"
CREATE TABLE `sesiones` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_ID` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expira_en` DATETIME(3) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex on session token (UNIQUE)
CREATE UNIQUE INDEX `sesiones_token_key` ON `sesiones`(`token`);

-- CreateTable "metas_aceptadas"
CREATE TABLE `metas_aceptadas` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_ID` VARCHAR(191) NOT NULL,
    `meta_id` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey "tokens"
ALTER TABLE `tokens` ADD CONSTRAINT `tokens_usuario_ID_fkey` FOREIGN KEY (`usuario_ID`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey "sesiones"
ALTER TABLE `sesiones` ADD CONSTRAINT `sesiones_usuario_ID_fkey` FOREIGN KEY (`usuario_ID`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey "metas_aceptadas"
ALTER TABLE `metas_aceptadas` ADD CONSTRAINT `metas_aceptadas_usuario_ID_fkey` FOREIGN KEY (`usuario_ID`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;