/*
  Warnings:

  - You are about to drop the column `photoFilename` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `users` DROP COLUMN `photoFilename`,
    ADD COLUMN `pictureFilename` VARCHAR(191) NULL;
