/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `players` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."players" ADD COLUMN     "maxHealth" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "totalPlayTime" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "socketId" DROP NOT NULL,
ALTER COLUMN "isOnline" SET DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "players_name_key" ON "public"."players"("name");
