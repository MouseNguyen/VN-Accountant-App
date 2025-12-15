-- CreateEnum
CREATE TYPE "IncomeCategory" AS ENUM ('AGRI_RAW', 'AGRI_PROD', 'GENERAL', 'SERVICE', 'ASSET_SALE');

-- CreateEnum
CREATE TYPE "CashInCategory" AS ENUM ('RECEIVABLE_COLLECTION', 'BANK_LOAN', 'OWNER_CAPITAL', 'INTEREST_INCOME', 'TAX_REFUND', 'INSURANCE_CLAIM', 'OTHER_INCOME');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpenseType" ADD VALUE 'SALARY';
ALTER TYPE "ExpenseType" ADD VALUE 'UTILITY';
ALTER TYPE "ExpenseType" ADD VALUE 'RENT';
ALTER TYPE "ExpenseType" ADD VALUE 'LOAN_REPAYMENT';
ALTER TYPE "ExpenseType" ADD VALUE 'ENTERTAINMENT';
ALTER TYPE "ExpenseType" ADD VALUE 'EQUIPMENT';
ALTER TYPE "ExpenseType" ADD VALUE 'VEHICLE';
ALTER TYPE "ExpenseType" ADD VALUE 'INSURANCE';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "cash_in_category" "CashInCategory",
ADD COLUMN     "income_category" "IncomeCategory";
