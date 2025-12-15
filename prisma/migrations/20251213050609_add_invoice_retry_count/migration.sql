-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0;
