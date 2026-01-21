"use server";

import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Brand from "@/models/Brand";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

// --- SECURITY: SHARED ADMIN CHECK ---
async function checkAdmin() {
  const session = await auth();
  const adminEmail = "steveweed1979@gmail.com"; 
  if (!session?.user || session.user.email !== adminEmail) {
    throw new Error("Unauthorized: Administrative Access Required.");
  }
}

// --- BRAND ACTIONS (CATEGORIES) ---
export async function createBrand(formData: FormData) {
  await checkAdmin();
  await dbConnect();
  const name = formData.get("name");
  if (!name) throw new Error("Name required");
  await Brand.create({ name });
  revalidatePath("/admin");
}

export async function deleteBrand(formData: FormData) {
  await checkAdmin();
  await dbConnect();
  const brandId = formData.get("brandId");
  
  // Integrity Check: Prevent orphaned cards
  const cardCount = await Card.countDocuments({ brand: brandId });
  if (cardCount > 0) throw new Error("Category not empty. Remove cards first.");
  
  await Brand.findByIdAndDelete(brandId);
  revalidatePath("/admin");
}

// --- CARD ACTIONS (CRUD & VAULT) ---

// CREATE
export async function createCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();
  await Card.create({
    name: formData.get("name"),
    price: parseFloat(formData.get("price") as string),
    rarity: formData.get("rarity"),
    brand: formData.get("brandId"),
    image: formData.get("image"),
    description: formData.get("description"),
    isVault: false,
  });
  revalidatePath("/admin");
  revalidatePath("/shop");
}

export async function updateCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const cardId = formData.get("cardId");
  const updates = {
    name: formData.get("name") as string,
    price: parseFloat(formData.get("price") as string),
    rarity: formData.get("rarity") as string,
    image: formData.get("image") as string,
    description: formData.get("description") as string, // Added this line
  };

  await Card.findByIdAndUpdate(cardId, updates);

  revalidatePath("/admin");
  revalidatePath("/shop");
  revalidatePath("/");
}

// DELETE (THE "D" IN CRUD)
export async function deleteCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();
  await Card.findByIdAndDelete(formData.get("cardId"));
  revalidatePath("/admin");
  revalidatePath("/shop");
  revalidatePath("/");
}

// VAULT LOGISTICS
export async function updateVaultStatus(formData: FormData) {
  await checkAdmin();
  await dbConnect();
  const cardId = formData.get("cardId");
  const actionType = formData.get("actionType");
  const releaseRaw = formData.get("vaultReleaseDate");
  const expiryRaw = formData.get("vaultExpiryDate");

  if (actionType === "deactivate") {
    await Card.findByIdAndUpdate(cardId, { 
      isVault: false, 
      vaultReleaseDate: null, 
      vaultExpiryDate: null 
    });
  } else {
    await Card.findByIdAndUpdate(cardId, {
      isVault: true,
      vaultReleaseDate: releaseRaw ? new Date(releaseRaw as string) : new Date(),
      vaultExpiryDate: expiryRaw ? new Date(expiryRaw as string) : null,
    });
  }
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/shop");
}