-- CreateEnum
CREATE TYPE "WorkerType" AS ENUM ('FULL_TIME', 'PART_TIME', 'SEASONAL', 'CONTRACT');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('MONTHLY', 'DAILY', 'HOURLY', 'PIECE');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIAL_PAID', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "annual_leave_days" DECIMAL(4,2) NOT NULL DEFAULT 12,
ADD COLUMN     "annual_leave_used" DECIMAL(4,2) NOT NULL DEFAULT 0,
ADD COLUMN     "bank_holder" TEXT,
ADD COLUMN     "base_salary" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "dependents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "end_date" DATE,
ADD COLUMN     "id_card" TEXT,
ADD COLUMN     "insurance_base" DECIMAL(18,2),
ADD COLUMN     "is_subject_to_tax" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "salary_type" "SalaryType" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "sick_leave_days" DECIMAL(4,2) NOT NULL DEFAULT 3,
ADD COLUMN     "sick_leave_used" DECIMAL(4,2) NOT NULL DEFAULT 0,
ADD COLUMN     "start_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "WorkerStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "worker_type" "WorkerType" NOT NULL DEFAULT 'FULL_TIME';

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "attendance_type" "AttendanceType" NOT NULL DEFAULT 'PRESENT',
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "work_hours" DECIMAL(4,2) NOT NULL DEFAULT 8,
    "ot_normal_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "ot_weekend_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "ot_holiday_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "night_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_configs" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "bhxh_employee_rate" DECIMAL(4,2) NOT NULL DEFAULT 8,
    "bhyt_employee_rate" DECIMAL(4,2) NOT NULL DEFAULT 1.5,
    "bhtn_employee_rate" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "max_insurance_base" DECIMAL(18,2) NOT NULL DEFAULT 36000000,
    "personal_deduction" DECIMAL(18,2) NOT NULL DEFAULT 11000000,
    "dependent_deduction" DECIMAL(18,2) NOT NULL DEFAULT 4400000,
    "ot_normal_rate" DECIMAL(4,2) NOT NULL DEFAULT 1.5,
    "ot_weekend_rate" DECIMAL(4,2) NOT NULL DEFAULT 2.0,
    "ot_holiday_rate" DECIMAL(4,2) NOT NULL DEFAULT 3.0,
    "night_bonus_rate" DECIMAL(4,2) NOT NULL DEFAULT 0.3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "period_type" TEXT NOT NULL DEFAULT 'MONTHLY',
    "total_base" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_ot" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_allowance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_deduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_gross" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "payroll_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "salary_type" "SalaryType" NOT NULL,
    "base_rate" DECIMAL(18,2) NOT NULL,
    "work_days" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "work_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "ot_normal_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "ot_weekend_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "ot_holiday_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "night_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "base_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ot_normal_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ot_weekend_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ot_holiday_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "night_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "allowances" JSONB,
    "total_allowance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deductions" JSONB,
    "total_deduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bhxh_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bhyt_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bhtn_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "insurance_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gross_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_payments" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "payroll_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "payroll_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendances_farm_id_work_date_idx" ON "attendances"("farm_id", "work_date");

-- CreateIndex
CREATE INDEX "attendances_farm_id_worker_id_idx" ON "attendances"("farm_id", "worker_id");

-- CreateIndex
CREATE INDEX "attendances_farm_id_work_date_attendance_type_idx" ON "attendances"("farm_id", "work_date", "attendance_type");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_farm_id_worker_id_work_date_key" ON "attendances"("farm_id", "worker_id", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_configs_farm_id_key" ON "insurance_configs"("farm_id");

-- CreateIndex
CREATE INDEX "payrolls_farm_id_period_start_idx" ON "payrolls"("farm_id", "period_start");

-- CreateIndex
CREATE INDEX "payrolls_farm_id_status_idx" ON "payrolls"("farm_id", "status");

-- CreateIndex
CREATE INDEX "payrolls_farm_id_period_start_period_end_idx" ON "payrolls"("farm_id", "period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_farm_id_code_key" ON "payrolls"("farm_id", "code");

-- CreateIndex
CREATE INDEX "payroll_items_farm_id_payroll_id_idx" ON "payroll_items"("farm_id", "payroll_id");

-- CreateIndex
CREATE INDEX "payroll_items_farm_id_worker_id_idx" ON "payroll_items"("farm_id", "worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_items_payroll_id_worker_id_key" ON "payroll_items"("payroll_id", "worker_id");

-- CreateIndex
CREATE INDEX "payroll_payments_farm_id_payroll_id_idx" ON "payroll_payments"("farm_id", "payroll_id");

-- CreateIndex
CREATE INDEX "workers_farm_id_status_idx" ON "workers"("farm_id", "status");

-- CreateIndex
CREATE INDEX "workers_farm_id_worker_type_idx" ON "workers"("farm_id", "worker_type");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_configs" ADD CONSTRAINT "insurance_configs_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
