-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
