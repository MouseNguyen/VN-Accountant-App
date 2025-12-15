-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "confirmed_by" TEXT;

-- AlterTable
ALTER TABLE "payment_histories" ADD COLUMN     "balance_after" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "balance_before" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payroll_items" ADD COLUMN     "employer_bhtn" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "employer_bhtnld" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "employer_bhxh" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "employer_bhyt" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payrolls" ADD COLUMN     "employer_insurance_transaction_id" TEXT;

-- AddForeignKey
ALTER TABLE "payment_histories" ADD CONSTRAINT "payment_histories_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
