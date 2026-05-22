-- AlterTable
ALTER TABLE "Voting" ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "resultPdfUrl" TEXT,
ADD COLUMN     "nonVotersPdfUrl" TEXT;
