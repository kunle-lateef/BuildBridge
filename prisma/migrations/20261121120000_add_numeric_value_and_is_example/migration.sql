-- AlterTable
ALTER TABLE "handoffs" ADD COLUMN     "is_example" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "specifications" ADD COLUMN     "numeric_value" DOUBLE PRECISION;

