/*
  Warnings:

  - You are about to drop the column `attempt_at` on the `failed_logins` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `failed_logins` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `failed_logins` table. All the data in the column will be lost.
  - You are about to drop the column `transactions_hash` on the `period_locks` table. All the data in the column will be lost.
  - You are about to drop the column `value_type` on the `tax_rules` table. All the data in the column will be lost.
  - Added the required column `failure_reason` to the `failed_logins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `login_identifier` to the `failed_logins` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaxRuleType" AS ENUM ('VAT_RATE', 'VAT_DEDUCTIBLE', 'CIT_ADD_BACK', 'CIT_DEDUCTION', 'PIT_DEDUCTION', 'PIT_BRACKET');

-- CreateEnum
CREATE TYPE "TaxRuleAction" AS ENUM ('SET_RATE', 'DENY', 'LIMIT', 'ADD_BACK', 'DEDUCT', 'WARN');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('VAT', 'CIT', 'PIT');

-- CreateEnum
CREATE TYPE "TaxScheduleStatus" AS ENUM ('PENDING', 'REMINDED', 'SUBMITTED', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "CITPeriodType" AS ENUM ('QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "CITAdjustmentType" AS ENUM ('ADD_BACK', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('MACHINERY', 'VEHICLE', 'BUILDING', 'EQUIPMENT', 'LIVESTOCK', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'DISPOSED', 'SOLD', 'UNDER_REPAIR');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'EXPORT';
ALTER TYPE "AuditAction" ADD VALUE 'IMPORT';
ALTER TYPE "AuditAction" ADD VALUE 'PERIOD_LOCK';
ALTER TYPE "AuditAction" ADD VALUE 'PERIOD_UNLOCK';
ALTER TYPE "AuditAction" ADD VALUE 'VAT_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_CHANGE';

-- DropIndex
DROP INDEX "failed_logins_email_attempt_at_idx";

-- DropIndex
DROP INDEX "failed_logins_ip_address_attempt_at_idx";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "entity_name" TEXT,
ADD COLUMN     "hash" TEXT,
ADD COLUMN     "previous_hash" TEXT;

-- AlterTable
ALTER TABLE "failed_logins" DROP COLUMN "attempt_at",
DROP COLUMN "email",
DROP COLUMN "reason",
ADD COLUMN     "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "failure_reason" TEXT NOT NULL,
ADD COLUMN     "login_identifier" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "period_locks" DROP COLUMN "transactions_hash",
ADD COLUMN     "hash" TEXT,
ADD COLUMN     "previous_hash" TEXT;

-- AlterTable
ALTER TABLE "tax_rules" DROP COLUMN "value_type",
ADD COLUMN     "action" "TaxRuleAction" NOT NULL DEFAULT 'SET_RATE',
ADD COLUMN     "condition" JSONB,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "effective_from" DATE,
ADD COLUMN     "effective_to" DATE,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "limit_value" DECIMAL(18,2),
ADD COLUMN     "master_version" INTEGER,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "rule_type" "TaxRuleType" NOT NULL DEFAULT 'VAT_RATE',
ADD COLUMN     "synced_at" TIMESTAMP(3),
ALTER COLUMN "name" DROP NOT NULL;

-- CreateTable
CREATE TABLE "tax_package_exports" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "period_type" TEXT NOT NULL,
    "period_code" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "contents" JSONB,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "last_downloaded_at" TIMESTAMP(3),

    CONSTRAINT "tax_package_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rule_histories" (
    "id" TEXT NOT NULL,
    "tax_rule_id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_value" DECIMAL(18,2),
    "new_value" DECIMAL(18,2),
    "master_version" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "tax_rule_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cit_calculations" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "period_type" "CITPeriodType" NOT NULL DEFAULT 'QUARTERLY',
    "total_revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "other_income" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_expenses" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "accounting_profit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "add_backs" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxable_income" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "cit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "loss_carried" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "calculated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "cit_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cit_adjustments" (
    "id" TEXT NOT NULL,
    "cit_calculation_id" TEXT NOT NULL,
    "adjustment_type" "CITAdjustmentType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cit_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pit_calculations" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "gross_income" DECIMAL(18,2) NOT NULL,
    "insurance_deduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "family_deduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dependent_deduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "other_deduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_deduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxable_income" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_brackets" JSONB,
    "dependents_count" INTEGER NOT NULL DEFAULT 0,
    "payroll_id" TEXT,
    "calculated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pit_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "purchase_date" DATE NOT NULL,
    "purchase_price" DECIMAL(18,2) NOT NULL,
    "supplier" TEXT,
    "invoice_number" TEXT,
    "useful_life_months" INTEGER NOT NULL,
    "depreciation_method" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "monthly_depreciation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "residual_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "original_cost" DECIMAL(18,2) NOT NULL,
    "accumulated_depreciation" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "book_value" DECIMAL(18,2) NOT NULL,
    "location" TEXT,
    "serial_number" TEXT,
    "image_url" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "disposed_at" TIMESTAMP(3),
    "disposed_value" DECIMAL(18,2),
    "disposal_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_schedules" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "depreciation_amount" DECIMAL(18,2) NOT NULL,
    "accumulated_amount" DECIMAL(18,2) NOT NULL,
    "remaining_value" DECIMAL(18,2) NOT NULL,
    "is_posted" BOOLEAN NOT NULL DEFAULT false,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depreciation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_schedules" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "tax_type" "TaxType" NOT NULL,
    "period" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "TaxScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,2),
    "reminded_at" TIMESTAMP(3),
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "payment_ref" TEXT,
    "vat_declaration_id" TEXT,
    "cit_calculation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_package_exports_farm_id_period_code_idx" ON "tax_package_exports"("farm_id", "period_code");

-- CreateIndex
CREATE INDEX "tax_package_exports_farm_id_created_at_idx" ON "tax_package_exports"("farm_id", "created_at");

-- CreateIndex
CREATE INDEX "tax_rule_histories_tax_rule_id_created_at_idx" ON "tax_rule_histories"("tax_rule_id", "created_at");

-- CreateIndex
CREATE INDEX "tax_rule_histories_farm_id_created_at_idx" ON "tax_rule_histories"("farm_id", "created_at");

-- CreateIndex
CREATE INDEX "cit_calculations_farm_id_period_type_idx" ON "cit_calculations"("farm_id", "period_type");

-- CreateIndex
CREATE INDEX "cit_calculations_farm_id_status_idx" ON "cit_calculations"("farm_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cit_calculations_farm_id_period_key" ON "cit_calculations"("farm_id", "period");

-- CreateIndex
CREATE INDEX "cit_adjustments_cit_calculation_id_idx" ON "cit_adjustments"("cit_calculation_id");

-- CreateIndex
CREATE INDEX "cit_adjustments_adjustment_type_category_idx" ON "cit_adjustments"("adjustment_type", "category");

-- CreateIndex
CREATE INDEX "pit_calculations_farm_id_period_idx" ON "pit_calculations"("farm_id", "period");

-- CreateIndex
CREATE INDEX "pit_calculations_employee_id_period_idx" ON "pit_calculations"("employee_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "pit_calculations_farm_id_employee_id_period_key" ON "pit_calculations"("farm_id", "employee_id", "period");

-- CreateIndex
CREATE INDEX "assets_farm_id_category_idx" ON "assets"("farm_id", "category");

-- CreateIndex
CREATE INDEX "assets_farm_id_status_idx" ON "assets"("farm_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "assets_farm_id_code_key" ON "assets"("farm_id", "code");

-- CreateIndex
CREATE INDEX "depreciation_schedules_period_is_posted_idx" ON "depreciation_schedules"("period", "is_posted");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_schedules_asset_id_period_key" ON "depreciation_schedules"("asset_id", "period");

-- CreateIndex
CREATE INDEX "tax_schedules_farm_id_status_idx" ON "tax_schedules"("farm_id", "status");

-- CreateIndex
CREATE INDEX "tax_schedules_farm_id_due_date_idx" ON "tax_schedules"("farm_id", "due_date");

-- CreateIndex
CREATE INDEX "tax_schedules_due_date_status_idx" ON "tax_schedules"("due_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_schedules_farm_id_tax_type_period_key" ON "tax_schedules"("farm_id", "tax_type", "period");

-- CreateIndex
CREATE INDEX "failed_logins_login_identifier_attempted_at_idx" ON "failed_logins"("login_identifier", "attempted_at");

-- CreateIndex
CREATE INDEX "failed_logins_ip_address_attempted_at_idx" ON "failed_logins"("ip_address", "attempted_at");

-- CreateIndex
CREATE INDEX "tax_rules_farm_id_rule_type_idx" ON "tax_rules"("farm_id", "rule_type");

-- CreateIndex
CREATE INDEX "tax_rules_farm_id_is_active_idx" ON "tax_rules"("farm_id", "is_active");

-- AddForeignKey
ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_unlocked_by_fkey" FOREIGN KEY ("unlocked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_package_exports" ADD CONSTRAINT "tax_package_exports_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_package_exports" ADD CONSTRAINT "tax_package_exports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rule_histories" ADD CONSTRAINT "tax_rule_histories_tax_rule_id_fkey" FOREIGN KEY ("tax_rule_id") REFERENCES "tax_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cit_calculations" ADD CONSTRAINT "cit_calculations_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cit_adjustments" ADD CONSTRAINT "cit_adjustments_cit_calculation_id_fkey" FOREIGN KEY ("cit_calculation_id") REFERENCES "cit_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pit_calculations" ADD CONSTRAINT "pit_calculations_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pit_calculations" ADD CONSTRAINT "pit_calculations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_schedules" ADD CONSTRAINT "depreciation_schedules_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_schedules" ADD CONSTRAINT "tax_schedules_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
