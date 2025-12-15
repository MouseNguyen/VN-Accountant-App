/*
  Warnings:

  - You are about to drop the column `vendor_name` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_tax_code` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "vendor_name",
DROP COLUMN "vendor_tax_code",
ADD COLUMN     "match_confidence" DECIMAL(5,2),
ADD COLUMN     "matched_partner_id" TEXT,
ADD COLUMN     "ocr_parsed" JSONB,
ADD COLUMN     "ocr_provider" TEXT,
ADD COLUMN     "ocr_raw" JSONB,
ADD COLUMN     "subtotal" DECIMAL(18,2),
ADD COLUMN     "supplier_name" TEXT,
ADD COLUMN     "supplier_tax_code" TEXT,
ADD COLUMN     "tax_amount" DECIMAL(18,2);
