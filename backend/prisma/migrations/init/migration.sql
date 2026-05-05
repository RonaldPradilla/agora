-- CreateTable "usuarios"
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `email_hash` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `cuenta_activa` BOOLEAN NOT NULL DEFAULT true,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_email_hash_key`(`email_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable "sesiones"
CREATE TABLE `sesiones` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_ID` VARCHAR(191) NOT NULL,
    `token` VARCHAR(512) NOT NULL,
    `expira_en` DATETIME(3) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sesiones_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable "metas_aceptadas"
CREATE TABLE `metas_aceptadas` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_ID` VARCHAR(191) NOT NULL,
    `meta_id` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sesiones` ADD CONSTRAINT `sesiones_usuario_ID_fkey` FOREIGN KEY (`usuario_ID`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metas_aceptadas` ADD CONSTRAINT `metas_aceptadas_usuario_ID_fkey` FOREIGN KEY (`usuario_ID`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
