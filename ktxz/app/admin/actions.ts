"use server";

import { revalidatePath } from "next/cache";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import dbConnect from "@/lib/dbConnect";
import { auth } from "@/auth";

const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

function parseNumber(value: unknown, fallback: number) {
  const n = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseIntSafe(value: unknown, fallback: number) {
  const n = typeof value === "string" ? parseInt(value, 10) : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

async function checkAdmin() {
  const session = await auth();
  const isAdmin =
    session?.user?.email === process.env.ADMIN_EMAIL ||
    (session?.user as any)?.role === "admin";
  if (!isAdmin) throw new Error("Unauthorized Access Required.");
}

export async function createBrand(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) throw new Error("Name required");

  await Brand.create({ name, slug: slugify(name) });
  revalidatePath("/admin");
}

export async function deleteBrand(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const brandId = formData.get("brandId") as string;
  const hasCards = await Card.exists({ brand: brandId });
  if (hasCards) throw new Error("Cannot delete category with active cards.");

  await Brand.findByIdAndDelete(brandId);
  revalidatePath("/admin");
}

export async function createCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const rawData = Object.fromEntries(formData.entries());

  const brandId = rawData.brandId || rawData.brand;
  if (!brandId) throw new Error("Category/Brand is required.");

  const name = String(rawData.name || "").trim();
  if (!name) throw new Error("Card name is required.");

  const inventoryTypeRaw = String(rawData.inventoryType || "single").toLowerCase();
  const inventoryType = inventoryTypeRaw === "bulk" ? "bulk" : "single";

  // For singles, enforce stock=1. For bulk, allow stock input (default to 0 if provided invalid).
  const stock =
    inventoryType === "single"
      ? 1
      : Math.max(0, parseIntSafe(rawData.stock, 0));

  // Default active unless explicitly disabled (checkbox patterns vary by UI; safe default).
  const isActive =
    rawData.isActive === undefined ? true : rawData.isActive === "on" || rawData.isActive === "true";

  // Status defaults: active (unless admin explicitly sets otherwise later)
  const statusRaw = String(rawData.status || "active").toLowerCase();
  const status =
    statusRaw === "reserved" || statusRaw === "sold" || statusRaw === "inactive"
      ? statusRaw
      : "active";

  await Card.create({
    name,
    slug: slugify(name),
    price: parseNumber(rawData.price, 0),
    description: rawData.description ? String(rawData.description) : "",
    rarity: rawData.rarity ? String(rawData.rarity) : "",
    image: rawData.image ? String(rawData.image) : "",
    brand: String(brandId),

    inventoryType,
    stock,
    status,
    isActive,

    // Vault flags/dates
    isVault: rawData.isVault === "on",
    updatedAt: new Date(),
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/shop");
}

export async function updateCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const rawData = Object.fromEntries(formData.entries());
  const cardId = String(rawData.cardId || "").trim();
  if (!cardId) throw new Error("Card ID required.");

  // Build a safe update object: only update fields that exist in the form
  const update: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (rawData.name !== undefined) {
    const name = String(rawData.name || "").trim();
    if (!name) throw new Error("Card name is required.");
    update.name = name;
    update.slug = slugify(name);
  }

  if (rawData.price !== undefined) update.price = parseNumber(rawData.price, 0);
  if (rawData.rarity !== undefined) update.rarity = String(rawData.rarity || "");
  if (rawData.description !== undefined) update.description = String(rawData.description || "");
  if (rawData.image !== undefined) update.image = String(rawData.image || "");

  // Inventory fields (won’t change unless you add them to the admin UI)
  if (rawData.inventoryType !== undefined) {
    const inventoryTypeRaw = String(rawData.inventoryType || "single").toLowerCase();
    update.inventoryType = inventoryTypeRaw === "bulk" ? "bulk" : "single";
  }

  if (rawData.stock !== undefined) {
    // Enforce singles always stock=1 if inventoryType is (or becomes) single
    const current = await Card.findById(cardId).select("inventoryType").lean();
    const currentType = (current as any)?.inventoryType === "bulk" ? "bulk" : "single";
    const nextType =
      update.inventoryType === "bulk" || update.inventoryType === "single"
        ? update.inventoryType
        : currentType;

    update.stock =
      nextType === "single" ? 1 : Math.max(0, parseIntSafe(rawData.stock, 0));
  }

  if (rawData.isActive !== undefined) {
    update.isActive = rawData.isActive === "on" || rawData.isActive === "true";
  }

  if (rawData.status !== undefined) {
    const statusRaw = String(rawData.status || "").toLowerCase();
    update.status =
      statusRaw === "active" || statusRaw === "reserved" || statusRaw === "sold" || statusRaw === "inactive"
        ? statusRaw
        : "active";
  }

  // Vault toggle checkbox (existing UI relies on this)
  if (rawData.isVault !== undefined) update.isVault = rawData.isVault === "on";

  await Card.findByIdAndUpdate(cardId, update);

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/shop");
}

export async function deleteCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const cardId = formData.get("cardId") as string;
  await Card.findByIdAndDelete(cardId);

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/shop");
}

export async function updateVaultStatus(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const rawData = Object.fromEntries(formData.entries());
  const cardId = rawData.cardId as string;
  const release = rawData.vaultReleaseDate as string;
  const expiry = rawData.vaultExpiryDate as string;

  await Card.findByIdAndUpdate(cardId, {
    isVault: true,
    vaultReleaseDate: release ? new Date(release) : null,
    vaultExpiryDate: expiry ? new Date(expiry) : null,
    updatedAt: new Date(),
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/shop");
}

export async function removeFromVault(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const cardId = formData.get("cardId") as string;

  await Card.findByIdAndUpdate(cardId, {
    isVault: false,
    vaultReleaseDate: null,
    vaultExpiryDate: null,
    updatedAt: new Date(),
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/shop");
}
