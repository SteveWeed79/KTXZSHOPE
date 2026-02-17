/** Check if a card can be purchased based on its inventory state. */
export function canPurchaseCard(card: {
  isActive?: boolean;
  status?: string;
  inventoryType?: string;
  stock?: number;
}): boolean {
  const isInactive = card.isActive === false || card.status === "inactive";
  const isSold = card.status === "sold";
  const isBulk = (card.inventoryType || "single") === "bulk";
  const stock = typeof card.stock === "number" ? card.stock : 1;
  return !isInactive && !isSold && (!isBulk || stock > 0);
}

/** Public MongoDB inventory filter for listings visible to shoppers. */
export const PUBLIC_INVENTORY_FILTER = {
  $and: [
    { isActive: { $ne: false } },
    { $or: [{ status: { $exists: false } }, { status: "active" }] },
    {
      $or: [
        { inventoryType: { $exists: false } },
        { inventoryType: "single" },
        { inventoryType: "bulk", stock: { $gt: 0 } },
      ],
    },
  ],
};
