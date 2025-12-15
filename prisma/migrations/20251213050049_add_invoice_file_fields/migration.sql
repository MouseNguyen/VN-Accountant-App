-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "file_size" INTEGER;

-- CreateIndex
CREATE INDEX "invoices_farm_id_status_idx" ON "invoices"("farm_id", "status");

-- CreateIndex
CREATE INDEX "invoices_image_hash_idx" ON "invoices"("image_hash");
