-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "credit_limit" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payment_term_days" INTEGER NOT NULL DEFAULT 30;
