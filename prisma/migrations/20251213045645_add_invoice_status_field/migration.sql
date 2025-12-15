-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING';
