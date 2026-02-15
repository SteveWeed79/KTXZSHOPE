/**
 * ============================================================================
 * FILE: ktxz/app/admin/actions.ts
 * STATUS: DEMO-SAFE (Force visible refresh after mutations)
 * ============================================================================
 *
 * Why this file exists:
 * - Admin server actions for Brands, Cards, and Vault status.
 *
 * Demo behavior:
 * - After each successful mutation (create/update/delete), we:
 *   1) revalidatePath() for relevant routes
 *   2) redirect("/admin") to guarantee the UI visibly updates
 *
 * Notes:
 * - Keeps your admin authorization gate via isAdminUser(session.user)
 * - Preserves Vault actions: updateVaultStatus + removeFromVault
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import dbConnect from "@/lib/dbConnect";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/isAdmin";

// ============================================================================
// Helpers
// ============================================================================

function validateObjectId(id: unknown, label = "ID"): string {
  const str = String(id || "").trim();
  if (!str || !mongoose.Types.ObjectId.isValid(str)) {
    throw new Error(`Invalid ${label}.`);
  }
  return str;
}

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

/**
 * Convert FormData checkbox values to boolean.
 * - Unchecked checkbox -> field missing -> undefined
 * - Checked checkbox   -> "on" (default) or provided string value
 */
function checkboxToBool(value: FormDataEntryValue | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  if (typeof value !== "string") return defaultValue;
  return value === "on" || value === "true" || value === "1";
}

async function checkAdmin() {
  const session = await auth();
  if (!isAdminUser(session?.user as { email?: string; role?: string })) {
    throw new Error("Unauthorized Access Required.");
  }
}

/**
 * For demo reliability:
 * - revalidate pages that show these entities
 * - redirect back to /admin so the user sees the updated list immediately
 */
function demoBounceAdmin() {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/shop");
  redirect("/admin");
}

// ============================================================================
// Brand Actions
// ============================================================================

export async function createBrand(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) throw new Error("Name required");

  await Brand.create({ name, slug: slugify(name) });

  demoBounceAdmin();
}

export async function updateBrand(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const brandId = validateObjectId(formData.get("brandId"), "Brand ID");
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name required");

  await Brand.findByIdAndUpdate(brandId, { name, slug: slugify(name) }, { runValidators: true });

  demoBounceAdmin();
}

export async function deleteBrand(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const brandId = validateObjectId(formData.get("brandId"), "Brand ID");

  const hasCards = await Card.countDocuments({ brand: brandId });
  if (hasCards) throw new Error("Cannot delete category with active cards.");

  await Brand.findByIdAndDelete(brandId);

  demoBounceAdmin();
}

// ============================================================================
// Card Actions
// ============================================================================

export async function createCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const raw = Object.fromEntries(formData.entries());
  const rawData = raw as Record<string, FormDataEntryValue>;

  const brandId = validateObjectId(rawData.brandId ?? rawData.brand, "Category");

  const name = String(rawData.name || "").trim();
  if (!name) throw new Error("Card name is required.");

  const inventoryTypeRaw = String(rawData.inventoryType || "single").toLowerCase();
  const inventoryType = inventoryTypeRaw === "bulk" ? "bulk" : "single";

  const price = Math.max(0, parseNumber(rawData.price, 0));
  const stockInput = parseNumber(rawData.stock, 0);

  // singles always stock=1; bulk uses provided stock (>=0)
  const stock = inventoryType === "single" ? 1 : Math.max(0, stockInput);

  const description = String(rawData.description || "").trim();
  const image = String(rawData.image || rawData.imageUrl || "").trim();
  const rarity = String(rawData.rarity || "").trim();

  // If checkbox missing, default true (your prior behavior)
  const isActive = checkboxToBool(rawData.isActive, true);

  await Card.create({
    brand: brandId,
    name,
    inventoryType,
    stock,
    price,
    description,
    image,
    rarity,
    isActive,
  });

  demoBounceAdmin();
}

export async function updateCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const raw = Object.fromEntries(formData.entries());
  const rawData = raw as Record<string, FormDataEntryValue>;

  const cardId = validateObjectId(rawData.cardId, "Card ID");

  const update: any = {};

  if (rawData.brandId !== undefined || rawData.brand !== undefined) {
    update.brand = validateObjectId(rawData.brandId ?? rawData.brand, "Category");
  }

  if (rawData.name !== undefined) {
    const name = String(rawData.name || "").trim();
    if (!name) throw new Error("Card name is required.");
    update.name = name;
  }

  if (rawData.inventoryType !== undefined) {
    const invRaw = String(rawData.inventoryType || "single").toLowerCase();
    update.inventoryType = invRaw === "bulk" ? "bulk" : "single";
  }

  if (rawData.stock !== undefined) {
    update.stock = Math.max(0, parseNumber(rawData.stock, 0));
  }

  if (rawData.price !== undefined) {
    update.price = Math.max(0, parseNumber(rawData.price, 0));
  }

  if (rawData.rarity !== undefined) {
    update.rarity = String(rawData.rarity || "").trim();
  }

  if (rawData.description !== undefined) {
    update.description = String(rawData.description || "").trim();
  }

  if (rawData.image !== undefined || rawData.imageUrl !== undefined) {
    update.image = String(rawData.image || rawData.imageUrl || "").trim();
  }

  // Checkbox: if field present, set explicit boolean; if absent, don't change.
  if (rawData.isActive !== undefined) {
    update.isActive = checkboxToBool(rawData.isActive, false);
  }

  await Card.findByIdAndUpdate(cardId, update, { runValidators: true });

  demoBounceAdmin();
}

export async function deleteCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const cardId = validateObjectId(formData.get("cardId"), "Card ID");
  await Card.findByIdAndDelete(cardId);

  demoBounceAdmin();
}

// ============================================================================
// Vault Actions
// ============================================================================

export async function updateVaultStatus(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const raw = Object.fromEntries(formData.entries());
  const rawData = raw as Record<string, FormDataEntryValue>;

  const cardId = validateObjectId(rawData.cardId, "Card ID");

  const release = typeof rawData.vaultReleaseDate === "string" ? rawData.vaultReleaseDate : "";
  const expiry = typeof rawData.vaultExpiryDate === "string" ? rawData.vaultExpiryDate : "";

  await Card.findByIdAndUpdate(cardId, {
    isVault: true,
    vaultReleaseDate: release ? new Date(release) : null,
    vaultExpiryDate: expiry ? new Date(expiry) : null,
    updatedAt: new Date(),
  });

  demoBounceAdmin();
}

export async function removeFromVault(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const cardId = validateObjectId(formData.get("cardId"), "Card ID");

  await Card.findByIdAndUpdate(cardId, {
    isVault: false,
    vaultReleaseDate: null,
    vaultExpiryDate: null,
    updatedAt: new Date(),
  });

  demoBounceAdmin();
}
