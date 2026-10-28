-- AlterTable
ALTER TABLE `EmployeeProfile` ADD COLUMN `whatsappOptIn` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `EmployeeSensitive` ADD COLUMN `idNumberEnc` TEXT NULL,
    ADD COLUMN `idType` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `IncentiveRule` ADD COLUMN `audience` VARCHAR(191) NOT NULL DEFAULT 'ALL',
    ADD COLUMN `kind` VARCHAR(191) NOT NULL DEFAULT 'THRESHOLD',
    ADD COLUMN `topN` INTEGER NULL;

-- AlterTable
ALTER TABLE `IncentiveAward` ADD COLUMN `referralId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ReferralProgram` ADD COLUMN `rewardInr` INTEGER NULL;

