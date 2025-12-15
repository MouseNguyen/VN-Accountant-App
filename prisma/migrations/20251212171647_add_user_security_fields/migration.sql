-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "failed_login_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3);
