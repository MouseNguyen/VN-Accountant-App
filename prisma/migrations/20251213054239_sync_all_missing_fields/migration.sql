-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "confirmed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payroll_items" ADD COLUMN     "employer_insurance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payrolls" ADD COLUMN     "total_employer_insurance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "avg_cost" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "transaction_items" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "payment_note" TEXT;

-- CreateTable
CREATE TABLE "payment_histories" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "amount" DECIMAL(18,2) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "payment_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "payable_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_histories_farm_id_partner_id_idx" ON "payment_histories"("farm_id", "partner_id");

-- CreateIndex
CREATE INDEX "payment_histories_farm_id_payment_date_idx" ON "payment_histories"("farm_id", "payment_date");

-- CreateIndex
CREATE INDEX "payment_allocations_payment_id_idx" ON "payment_allocations"("payment_id");

-- CreateIndex
CREATE INDEX "payment_allocations_payable_id_idx" ON "payment_allocations"("payable_id");

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
