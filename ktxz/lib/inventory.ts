import Card from "@/models/Card";

/**
 * Atomically restore inventory for order items.
 * Used when cancelling/refunding orders that had stock deducted.
 */
export async function restoreInventory(
  orderItems: Array<{ card: string; quantity: number }>
) {
  for (const item of orderItems) {
    // Bulk: atomic increment
    const bulkResult = await Card.findOneAndUpdate(
      { _id: item.card, inventoryType: "bulk" },
      {
        $inc: { stock: item.quantity },
        $set: { status: "active", isActive: true },
      },
      { new: true }
    );

    if (bulkResult) continue;

    // Single: restore to 1 (guard inventoryType so we never overwrite a bulk card)
    await Card.findOneAndUpdate(
      { _id: item.card, inventoryType: "single" },
      { $set: { stock: 1, status: "active", isActive: true } }
    );
  }
}
