-- AlterTable
ALTER TABLE `Competition` ADD COLUMN `authorId` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX `Competition_authorId_idx` ON `Competition`(`authorId`);

-- AddForeignKey
ALTER TABLE `Competition` ADD CONSTRAINT `Competition_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
