-- AlterTable
ALTER TABLE "products" ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
