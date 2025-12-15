-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;
