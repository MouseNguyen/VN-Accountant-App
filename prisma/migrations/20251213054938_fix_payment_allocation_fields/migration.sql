/*
  Warnings:

  - Added the required column `farm_id` to the `payment_allocations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "payment_allocations" DROP CONSTRAINT "payment_allocations_payable_id_fkey";

-- AlterTable
ALTER TABLE "payment_allocations" ADD COLUMN     "farm_id" TEXT NOT NULL,
ADD COLUMN     "partner_id" TEXT,
ADD COLUMN     "transaction_id" TEXT,
ADD COLUMN     "transaction_paid_after" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "transaction_paid_before" DECIMAL(18,2) NOT NULL DEFAULT 0,
ALTER COLUMN "payable_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "payment_allocations_transaction_id_idx" ON "payment_allocations"("transaction_id");

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
