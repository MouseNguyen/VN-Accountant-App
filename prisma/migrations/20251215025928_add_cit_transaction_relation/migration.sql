-- AddForeignKey
ALTER TABLE "cit_adjustments" ADD CONSTRAINT "cit_adjustments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
