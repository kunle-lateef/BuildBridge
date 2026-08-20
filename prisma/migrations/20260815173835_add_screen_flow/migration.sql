-- CreateTable
CREATE TABLE "screen_flows" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "source_screen_id" TEXT NOT NULL,
    "target_screen_id" TEXT NOT NULL,
    "label" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screen_flows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "screen_flows_handoff_id_idx" ON "screen_flows"("handoff_id");

-- AddForeignKey
ALTER TABLE "screen_flows" ADD CONSTRAINT "screen_flows_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_flows" ADD CONSTRAINT "screen_flows_source_screen_id_fkey" FOREIGN KEY ("source_screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_flows" ADD CONSTRAINT "screen_flows_target_screen_id_fkey" FOREIGN KEY ("target_screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_flows" ADD CONSTRAINT "screen_flows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
