-- KalamDesk Phase 5: organisations (Robokalam, Samaritan, Calvings, Nextpreneur ...).
-- Run this ONCE in phpMyAdmin (your database > SQL tab > paste all > Go), AFTER prisma/phase4-upgrade.sql and BEFORE redeploying.
-- Everything that exists today becomes part of the organisation called "Robokalam"; nothing is deleted.
-- Afterwards, rename it, add the other organisations and invite their founders from the Organisations page.

CREATE TABLE `Organization` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(60) NOT NULL,
    `tagline` VARCHAR(160) NOT NULL DEFAULT '',
    `color` VARCHAR(9) NOT NULL DEFAULT '#4f46e5',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Organization_name_key`(`name`),
    UNIQUE INDEX `Organization_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `Organization` (`id`, `name`, `slug`, `tagline`, `color`, `active`) VALUES ('org_robokalam', 'Robokalam', 'robokalam', '', '#4f46e5', true);

ALTER TABLE `User` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD COLUMN `allOrgs` BOOLEAN NOT NULL DEFAULT false, ADD INDEX `User_orgId_idx`(`orgId`);
UPDATE `User` SET `orgId` = 'org_robokalam';
ALTER TABLE `Department` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `Department_orgId_idx`(`orgId`);
UPDATE `Department` SET `orgId` = 'org_robokalam';
ALTER TABLE `Task` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `Task_orgId_idx`(`orgId`);
UPDATE `Task` SET `orgId` = 'org_robokalam';
ALTER TABLE `RecurringRule` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `RecurringRule_orgId_idx`(`orgId`);
UPDATE `RecurringRule` SET `orgId` = 'org_robokalam';
ALTER TABLE `IncentiveRule` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `IncentiveRule_orgId_idx`(`orgId`);
UPDATE `IncentiveRule` SET `orgId` = 'org_robokalam';
ALTER TABLE `ReferralProgram` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `ReferralProgram_orgId_idx`(`orgId`);
UPDATE `ReferralProgram` SET `orgId` = 'org_robokalam';
ALTER TABLE `DashboardSnapshot` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `DashboardSnapshot_orgId_idx`(`orgId`);
UPDATE `DashboardSnapshot` SET `orgId` = 'org_robokalam';
ALTER TABLE `TaskTemplate` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `TaskTemplate_orgId_idx`(`orgId`);
UPDATE `TaskTemplate` SET `orgId` = 'org_robokalam';
ALTER TABLE `Challenge` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `Challenge_orgId_idx`(`orgId`);
UPDATE `Challenge` SET `orgId` = 'org_robokalam';
ALTER TABLE `Lead` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `Lead_orgId_idx`(`orgId`);
UPDATE `Lead` SET `orgId` = 'org_robokalam';
ALTER TABLE `ExpenseClaim` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `ExpenseClaim_orgId_idx`(`orgId`);
UPDATE `ExpenseClaim` SET `orgId` = 'org_robokalam';
ALTER TABLE `LeaveRequest` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `LeaveRequest_orgId_idx`(`orgId`);
UPDATE `LeaveRequest` SET `orgId` = 'org_robokalam';
ALTER TABLE `AttendanceLog` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `AttendanceLog_orgId_idx`(`orgId`);
UPDATE `AttendanceLog` SET `orgId` = 'org_robokalam';
ALTER TABLE `IdDocument` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `IdDocument_orgId_idx`(`orgId`);
UPDATE `IdDocument` SET `orgId` = 'org_robokalam';
ALTER TABLE `VisitReport` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `VisitReport_orgId_idx`(`orgId`);
UPDATE `VisitReport` SET `orgId` = 'org_robokalam';
ALTER TABLE `PersonDate` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `PersonDate_orgId_idx`(`orgId`);
UPDATE `PersonDate` SET `orgId` = 'org_robokalam';
ALTER TABLE `AuditLog` ADD COLUMN `orgId` VARCHAR(191) NULL, ADD INDEX `AuditLog_orgId_idx`(`orgId`);
UPDATE `AuditLog` SET `orgId` = 'org_robokalam';

-- Founders that exist today become group owners (they can switch between organisations).
-- If a founder should only ever see Robokalam, untick it later on the Organisations page.
UPDATE `User` SET `allOrgs` = true WHERE `role` = 'FOUNDER';

-- Department names only need to be unique inside one organisation.
ALTER TABLE `Department` DROP INDEX `Department_name_key`, ADD UNIQUE INDEX `Department_orgId_name_key`(`orgId`, `name`);
