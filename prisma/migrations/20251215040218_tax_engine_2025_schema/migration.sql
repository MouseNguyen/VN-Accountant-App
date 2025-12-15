-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED', 'BANKRUPT');

-- CreateEnum
CREATE TYPE "UsagePurpose" AS ENUM ('BUSINESS', 'PERSONAL', 'WELFARE_FUND');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('NORMAL', 'ADMIN_PENALTY', 'WELFARE', 'MATERIALS');

-- CreateEnum
CREATE TYPE "LaborType" AS ENUM ('FULL_TIME', 'CASUAL', 'PROBATION', 'NON_RESIDENT');

-- AlterEnum
ALTER TYPE "TaxRuleAction" ADD VALUE 'PARTIAL';

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "is_transport_biz" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_deductible_value" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "supplier_status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "accounting_expense" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cit_addback_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cit_addback_reason" TEXT,
ADD COLUMN     "cit_deductible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "expense_type" "ExpenseType" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "tax_expense" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "usage_purpose" "UsagePurpose" NOT NULL DEFAULT 'BUSINESS',
ADD COLUMN     "vat_deductible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "vat_deductible_amount" DECIMAL(18,2),
ADD COLUMN     "vat_rejection_code" TEXT,
ADD COLUMN     "vat_rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "commitment_08_date" DATE,
ADD COLUMN     "commitment_08_file" TEXT,
ADD COLUMN     "has_commitment_08" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_non_resident" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "labor_type" "LaborType" NOT NULL DEFAULT 'FULL_TIME';

-- CreateTable
CREATE TABLE "material_norms" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "norm_quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "period" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_norms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "welfare_expenses" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "welfare_type" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "period" TEXT NOT NULL,
    "description" TEXT,
    "expense_date" DATE,
    "is_capped" BOOLEAN NOT NULL DEFAULT false,
    "capped_amount" DECIMAL(18,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "welfare_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_norms_farm_id_idx" ON "material_norms"("farm_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_norms_farm_id_product_id_period_key" ON "material_norms"("farm_id", "product_id", "period");

-- CreateIndex
CREATE INDEX "welfare_expenses_farm_id_period_idx" ON "welfare_expenses"("farm_id", "period");

-- CreateIndex
CREATE INDEX "welfare_expenses_worker_id_idx" ON "welfare_expenses"("worker_id");

-- AddForeignKey
ALTER TABLE "material_norms" ADD CONSTRAINT "material_norms_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_norms" ADD CONSTRAINT "material_norms_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "welfare_expenses" ADD CONSTRAINT "welfare_expenses_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "welfare_expenses" ADD CONSTRAINT "welfare_expenses_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
