-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('FARM', 'RETAIL_FNB');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('CUSTOMER', 'VENDOR', 'BOTH');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('NONG_SAN', 'VAT_TU', 'MENU', 'NGUYEN_LIEU', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CASH_IN', 'CASH_OUT', 'SALE', 'PURCHASE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CREDIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID', 'PARTIAL');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('FULL_DAY', 'HALF_DAY', 'OVERTIME', 'HOURLY');

-- CreateEnum
CREATE TYPE "TaxRateType" AS ENUM ('INPUT', 'OUTPUT');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER', 'RETURN');

-- CreateEnum
CREATE TYPE "StockCountStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ARTransactionType" AS ENUM ('INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "APTransactionType" AS ENUM ('INVOICE', 'PAYMENT', 'DEBIT_NOTE', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "ARAPStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LockStatus" AS ENUM ('OPEN', 'LOCKED', 'PERMANENTLY_LOCKED');

-- CreateEnum
CREATE TYPE "VATDeclarationStatus" AS ENUM ('DRAFT', 'CALCULATED', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VATPeriodType" AS ENUM ('MONTHLY', 'QUARTERLY');

-- CreateTable
CREATE TABLE "farms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tax_code" TEXT,
    "business_type" "BusinessType" NOT NULL DEFAULT 'FARM',
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "locale" TEXT NOT NULL DEFAULT 'vi-VN',
    "fiscal_year_start" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "changed_fields" TEXT[],
    "ip_address" TEXT,
    "user_agent" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "type" "AccountType" NOT NULL,
    "level" INTEGER NOT NULL,
    "parent_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "type" "TaxRateType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rules" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "value_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "original_value" DECIMAL(18,2),
    "is_overridden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "company_name" TEXT,
    "tax_code" TEXT,
    "partner_type" "PartnerType" NOT NULL DEFAULT 'CUSTOMER',
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "category" "ProductCategory" NOT NULL DEFAULT 'NONG_SAN',
    "selling_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "purchase_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "trans_number" TEXT NOT NULL,
    "trans_date" DATE NOT NULL,
    "trans_type" "TransactionType" NOT NULL,
    "partner_id" TEXT,
    "partner_name" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "debit_account" TEXT,
    "credit_account" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "attachment_url" TEXT,
    "attachment_type" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name" TEXT NOT NULL,
    "product_code" TEXT,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "unit_price" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sub_total" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payables" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT,
    "source_number" TEXT,
    "original_amount" DECIMAL(18,2) NOT NULL,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(18,2) NOT NULL,
    "due_date" DATE,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "identity_card" TEXT,
    "identity_issue_date" DATE,
    "identity_issue_place" TEXT,
    "tax_code" TEXT,
    "has_tax_commitment" BOOLEAN NOT NULL DEFAULT false,
    "commitment_date" DATE,
    "daily_rate" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_income_ytd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bank_account" TEXT,
    "bank_name" TEXT,
    "id_card_front_url" TEXT,
    "id_card_back_url" TEXT,
    "contract_image_url" TEXT,
    "commitment_image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_logs" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "work_type" "WorkType" NOT NULL DEFAULT 'FULL_DAY',
    "hours" DECIMAL(5,2),
    "task" TEXT,
    "daily_rate" DECIMAL(18,2) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "transaction_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "invoice_type" TEXT,
    "invoice_number" TEXT,
    "invoice_date" DATE,
    "invoice_serial" TEXT,
    "vendor_name" TEXT,
    "vendor_tax_code" TEXT,
    "amount" DECIMAL(18,2),
    "vat_amount" DECIMAL(18,2),
    "total_amount" DECIMAL(18,2),
    "image_url" TEXT,
    "ocr_status" "OcrStatus" NOT NULL DEFAULT 'PENDING',
    "ocr_result" JSONB,
    "ocr_confidence" DECIMAL(5,2),
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "avg_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "min_quantity" DECIMAL(18,3),
    "max_quantity" DECIMAL(18,3),
    "reorder_point" DECIMAL(18,3),
    "location_code" TEXT DEFAULT 'DEFAULT',
    "last_movement_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "code" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "unit_price" DECIMAL(18,2) NOT NULL,
    "avg_cost_before" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "avg_cost_after" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cogs_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "qty_before" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "qty_after" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "from_location" TEXT,
    "to_location" TEXT,
    "transaction_id" TEXT,
    "partner_id" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_counts" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "count_date" DATE NOT NULL,
    "status" "StockCountStatus" NOT NULL DEFAULT 'DRAFT',
    "total_products" INTEGER NOT NULL DEFAULT 0,
    "total_variance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "stock_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_items" (
    "id" TEXT NOT NULL,
    "stock_count_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "system_qty" DECIMAL(18,3) NOT NULL,
    "counted_qty" DECIMAL(18,3) NOT NULL,
    "variance_qty" DECIMAL(18,3) NOT NULL,
    "variance_value" DECIMAL(18,2) NOT NULL,
    "variance_reason" TEXT,

    CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ar_transactions" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "ARTransactionType" NOT NULL,
    "code" TEXT NOT NULL,
    "trans_date" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(18,2) NOT NULL,
    "due_date" DATE,
    "days_overdue" INTEGER NOT NULL DEFAULT 0,
    "status" "ARAPStatus" NOT NULL DEFAULT 'UNPAID',
    "transaction_id" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ar_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ar_payment_allocations" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "ar_transaction_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ar_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ap_transactions" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "type" "APTransactionType" NOT NULL,
    "code" TEXT NOT NULL,
    "trans_date" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(18,2) NOT NULL,
    "due_date" DATE,
    "days_overdue" INTEGER NOT NULL DEFAULT 0,
    "status" "ARAPStatus" NOT NULL DEFAULT 'UNPAID',
    "transaction_id" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ap_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ap_payment_allocations" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "ap_transaction_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ap_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_locks" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "period_type" TEXT NOT NULL,
    "period_code" TEXT NOT NULL,
    "from_date" DATE NOT NULL,
    "to_date" DATE NOT NULL,
    "status" "LockStatus" NOT NULL DEFAULT 'OPEN',
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "lock_reason" TEXT,
    "unlocked_at" TIMESTAMP(3),
    "unlocked_by" TEXT,
    "unlock_reason" TEXT,
    "transactions_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "period_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_declarations" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "period_type" "VATPeriodType" NOT NULL,
    "period_code" TEXT NOT NULL,
    "from_date" DATE NOT NULL,
    "to_date" DATE NOT NULL,
    "input_vat_count" INTEGER NOT NULL DEFAULT 0,
    "input_vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "input_vat_tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "output_vat_count" INTEGER NOT NULL DEFAULT 0,
    "output_vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "output_vat_tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "payable_vat" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "carried_forward" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "adjustment_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "adjustment_reason" TEXT,
    "xml_content" TEXT,
    "xml_file_url" TEXT,
    "xml_generated_at" TIMESTAMP(3),
    "status" "VATDeclarationStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "submitted_by" TEXT,
    "submission_ref" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "vat_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_name" TEXT,
    "device_type" TEXT,
    "login_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failed_logins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "reason" TEXT,
    "attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failed_logins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_farm_id_idx" ON "users"("farm_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_farm_id_entity_type_entity_id_idx" ON "audit_logs"("farm_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_farm_id_created_at_idx" ON "audit_logs"("farm_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_code_key" ON "accounts"("code");

-- CreateIndex
CREATE INDEX "accounts_type_idx" ON "accounts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rates_code_key" ON "tax_rates"("code");

-- CreateIndex
CREATE INDEX "tax_rules_farm_id_category_idx" ON "tax_rules"("farm_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rules_farm_id_code_key" ON "tax_rules"("farm_id", "code");

-- CreateIndex
CREATE INDEX "partners_farm_id_partner_type_idx" ON "partners"("farm_id", "partner_type");

-- CreateIndex
CREATE INDEX "partners_farm_id_name_idx" ON "partners"("farm_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "partners_farm_id_code_key" ON "partners"("farm_id", "code");

-- CreateIndex
CREATE INDEX "products_farm_id_category_idx" ON "products"("farm_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "products_farm_id_code_key" ON "products"("farm_id", "code");

-- CreateIndex
CREATE INDEX "transactions_farm_id_trans_date_idx" ON "transactions"("farm_id", "trans_date");

-- CreateIndex
CREATE INDEX "transactions_farm_id_trans_type_trans_date_idx" ON "transactions"("farm_id", "trans_type", "trans_date");

-- CreateIndex
CREATE INDEX "transactions_farm_id_payment_status_idx" ON "transactions"("farm_id", "payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_farm_id_trans_number_key" ON "transactions"("farm_id", "trans_number");

-- CreateIndex
CREATE INDEX "transaction_items_transaction_id_idx" ON "transaction_items"("transaction_id");

-- CreateIndex
CREATE INDEX "payables_farm_id_partner_id_idx" ON "payables"("farm_id", "partner_id");

-- CreateIndex
CREATE INDEX "payables_farm_id_status_idx" ON "payables"("farm_id", "status");

-- CreateIndex
CREATE INDEX "workers_farm_id_is_active_idx" ON "workers"("farm_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "workers_farm_id_code_key" ON "workers"("farm_id", "code");

-- CreateIndex
CREATE INDEX "work_logs_farm_id_is_paid_work_date_idx" ON "work_logs"("farm_id", "is_paid", "work_date");

-- CreateIndex
CREATE INDEX "work_logs_worker_id_work_date_idx" ON "work_logs"("worker_id", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "work_logs_worker_id_work_date_work_type_key" ON "work_logs"("worker_id", "work_date", "work_type");

-- CreateIndex
CREATE INDEX "invoices_farm_id_ocr_status_idx" ON "invoices"("farm_id", "ocr_status");

-- CreateIndex
CREATE INDEX "stocks_farm_id_quantity_idx" ON "stocks"("farm_id", "quantity");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_farm_id_product_id_location_code_key" ON "stocks"("farm_id", "product_id", "location_code");

-- CreateIndex
CREATE INDEX "stock_movements_farm_id_product_id_date_idx" ON "stock_movements"("farm_id", "product_id", "date");

-- CreateIndex
CREATE INDEX "stock_movements_farm_id_type_date_idx" ON "stock_movements"("farm_id", "type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_farm_id_code_key" ON "stock_movements"("farm_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_counts_farm_id_code_key" ON "stock_counts"("farm_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_count_items_stock_count_id_product_id_key" ON "stock_count_items"("stock_count_id", "product_id");

-- CreateIndex
CREATE INDEX "ar_transactions_farm_id_customer_id_idx" ON "ar_transactions"("farm_id", "customer_id");

-- CreateIndex
CREATE INDEX "ar_transactions_farm_id_status_idx" ON "ar_transactions"("farm_id", "status");

-- CreateIndex
CREATE INDEX "ar_transactions_farm_id_due_date_idx" ON "ar_transactions"("farm_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "ar_transactions_farm_id_code_key" ON "ar_transactions"("farm_id", "code");

-- CreateIndex
CREATE INDEX "ar_payment_allocations_ar_transaction_id_idx" ON "ar_payment_allocations"("ar_transaction_id");

-- CreateIndex
CREATE INDEX "ap_transactions_farm_id_vendor_id_idx" ON "ap_transactions"("farm_id", "vendor_id");

-- CreateIndex
CREATE INDEX "ap_transactions_farm_id_status_idx" ON "ap_transactions"("farm_id", "status");

-- CreateIndex
CREATE INDEX "ap_transactions_farm_id_due_date_idx" ON "ap_transactions"("farm_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "ap_transactions_farm_id_code_key" ON "ap_transactions"("farm_id", "code");

-- CreateIndex
CREATE INDEX "ap_payment_allocations_ap_transaction_id_idx" ON "ap_payment_allocations"("ap_transaction_id");

-- CreateIndex
CREATE INDEX "period_locks_farm_id_status_idx" ON "period_locks"("farm_id", "status");

-- CreateIndex
CREATE INDEX "period_locks_farm_id_from_date_to_date_idx" ON "period_locks"("farm_id", "from_date", "to_date");

-- CreateIndex
CREATE UNIQUE INDEX "period_locks_farm_id_period_code_key" ON "period_locks"("farm_id", "period_code");

-- CreateIndex
CREATE INDEX "vat_declarations_farm_id_status_idx" ON "vat_declarations"("farm_id", "status");

-- CreateIndex
CREATE INDEX "vat_declarations_farm_id_from_date_to_date_idx" ON "vat_declarations"("farm_id", "from_date", "to_date");

-- CreateIndex
CREATE UNIQUE INDEX "vat_declarations_farm_id_period_code_key" ON "vat_declarations"("farm_id", "period_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_is_active_idx" ON "user_sessions"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "user_sessions_token_idx" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "failed_logins_email_attempt_at_idx" ON "failed_logins"("email", "attempt_at");

-- CreateIndex
CREATE INDEX "failed_logins_ip_address_attempt_at_idx" ON "failed_logins"("ip_address", "attempt_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_stock_count_id_fkey" FOREIGN KEY ("stock_count_id") REFERENCES "stock_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_transactions" ADD CONSTRAINT "ar_transactions_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_transactions" ADD CONSTRAINT "ar_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_transactions" ADD CONSTRAINT "ar_transactions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_payment_allocations" ADD CONSTRAINT "ar_payment_allocations_ar_transaction_id_fkey" FOREIGN KEY ("ar_transaction_id") REFERENCES "ar_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ap_transactions" ADD CONSTRAINT "ap_transactions_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ap_transactions" ADD CONSTRAINT "ap_transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ap_transactions" ADD CONSTRAINT "ap_transactions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ap_payment_allocations" ADD CONSTRAINT "ap_payment_allocations_ap_transaction_id_fkey" FOREIGN KEY ("ap_transaction_id") REFERENCES "ap_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_declarations" ADD CONSTRAINT "vat_declarations_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
