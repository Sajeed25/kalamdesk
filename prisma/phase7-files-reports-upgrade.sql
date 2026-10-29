-- KalamDesk Phase 7: (1) uploaded files are stored in the database, (2) session and workshop reports.
-- Run ONCE in phpMyAdmin (your database > SQL tab > paste all > Go), BEFORE redeploying.
-- Adds one new table and four new columns; nothing is removed or rewritten.

CREATE TABLE `FileBlob` (
    `key` VARCHAR(191) NOT NULL,
    `data` LONGBLOB NOT NULL,
    `size` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `VisitReport`
    ADD COLUMN `kind` VARCHAR(191) NOT NULL DEFAULT 'VISIT',
    ADD COLUMN `topics` VARCHAR(1000) NOT NULL DEFAULT '',
    ADD COLUMN `grade` VARCHAR(100) NULL,
    ADD COLUMN `teachers` INTEGER NULL;
