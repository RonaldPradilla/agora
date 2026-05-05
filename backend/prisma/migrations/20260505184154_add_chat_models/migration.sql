-- CreateTable
CREATE TABLE `chat_sesiones` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `estado` ENUM('activa', 'cerrada_por_usuario', 'cerrada_por_timeout', 'cerrada_por_sistema') NOT NULL DEFAULT 'activa',
    `fecha_inicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_fin` DATETIME(3) NULL,
    `contexto_ia` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_mensajes` (
    `id` VARCHAR(191) NOT NULL,
    `sesion_id` VARCHAR(191) NOT NULL,
    `remitente` ENUM('usuario', 'ia') NOT NULL,
    `contenido` VARCHAR(191) NOT NULL,
    `iv` VARCHAR(191) NOT NULL,
    `auth_tag` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `score_riesgo` DOUBLE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memoria_ia` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `contexto` VARCHAR(191) NOT NULL,
    `relevancia` DOUBLE NOT NULL DEFAULT 0.5,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Alerta` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `sesion_id` VARCHAR(191) NOT NULL,
    `score` DOUBLE NOT NULL,
    `palabras_clave` JSON NOT NULL,
    `estado` ENUM('pendiente', 'en_revision', 'resuelta', 'falsa_positiva') NOT NULL DEFAULT 'pendiente',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resuelto_en` DATETIME(3) NULL,
    `resuelto_por` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chat_sesiones` ADD CONSTRAINT `chat_sesiones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_mensajes` ADD CONSTRAINT `chat_mensajes_sesion_id_fkey` FOREIGN KEY (`sesion_id`) REFERENCES `chat_sesiones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memoria_ia` ADD CONSTRAINT `memoria_ia_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alerta` ADD CONSTRAINT `Alerta_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alerta` ADD CONSTRAINT `Alerta_sesion_id_fkey` FOREIGN KEY (`sesion_id`) REFERENCES `chat_sesiones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
