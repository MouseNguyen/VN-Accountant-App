-- CreateEnum
CREATE TYPE "CreditMemoStatus" AS ENUM ('DRAFT', 'POSTED', 'APPLIED', 'VOID');

-- CreateTable
CREATE TABLE "credit_memos" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "memo_number" TEXT NOT NULL,
    "memo_date" DATE NOT NULL,
    "customer_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "sub_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "applied_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "CreditMemoStatus" NOT NULL DEFAULT 'DRAFT',
    "posted_at" TIMESTAMP(3),
    "posted_by" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "credit_memos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_memos_farm_id_status_idx" ON "credit_memos"("farm_id", "status");

-- CreateIndex
CREATE INDEX "credit_memos_customer_id_idx" ON "credit_memos"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_memos_farm_id_memo_number_key" ON "credit_memos"("farm_id", "memo_number");

-- AddForeignKey
ALTER TABLE "credit_memos" ADD CONSTRAINT "credit_memos_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_memos" ADD CONSTRAINT "credit_memos_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_memos" ADD CONSTRAINT "credit_memos_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "ar_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
