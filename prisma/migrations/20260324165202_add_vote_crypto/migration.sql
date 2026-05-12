/*
  Warnings:

  - Added the required column `encryptedVote` to the `Vote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voteHash` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "encryptedVote" TEXT NOT NULL,
ADD COLUMN     "voteHash" TEXT NOT NULL;
