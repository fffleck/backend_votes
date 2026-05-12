/*
  Warnings:

  - You are about to drop the column `optionId` on the `Vote` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `Voting` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Voting` table. All the data in the column will be lost.
  - You are about to drop the `VotingOption` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_optionId_fkey";

-- DropForeignKey
ALTER TABLE "VotingOption" DROP CONSTRAINT "VotingOption_votingId_fkey";

-- AlterTable
ALTER TABLE "Vote" DROP COLUMN "optionId";

-- AlterTable
ALTER TABLE "Voting" DROP COLUMN "endDate",
DROP COLUMN "startDate";

-- DropTable
DROP TABLE "VotingOption";

-- CreateTable
CREATE TABLE "VotingStep" (
    "id" TEXT NOT NULL,
    "votingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minSelect" INTEGER NOT NULL,
    "maxSelect" INTEGER NOT NULL,

    CONSTRAINT "VotingStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingStepOption" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "VotingStepOption_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VotingStep" ADD CONSTRAINT "VotingStep_votingId_fkey" FOREIGN KEY ("votingId") REFERENCES "Voting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingStepOption" ADD CONSTRAINT "VotingStepOption_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "VotingStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
