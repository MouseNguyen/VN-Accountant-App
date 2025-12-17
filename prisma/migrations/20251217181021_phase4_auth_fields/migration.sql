-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'DRAFT';
ALTER TYPE "PaymentStatus" ADD VALUE 'POSTED';
ALTER TYPE "PaymentStatus" ADD VALUE 'VOID';

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "used_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "backup_codes" JSONB,
ADD COLUMN     "oauth_id" TEXT,
ADD COLUMN     "oauth_provider" TEXT,
ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_secret" TEXT;
