"use server";

import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Brand from "@/models/Brand";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

// --- SECURITY: VERIFY ADMIN SESSION ---
async function checkAdmin() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!session?.user || session.user.email !== adminEmail) {
    throw new Error("Unauthorized: Administrative Access Required.");
  }
}

// --- 1. GAME CATEGORY LOGIC ---
export async function createBrand(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const name = formData.get("name");
  if (!name) throw new Error("Brand name is required");

  try {
    await Brand.create({ name });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Database Error (Brand):", error);
    return { success: false, error: "Failed to create category" };
  }
}

// --- 2. INVENTORY UPLOAD LOGIC ---
// Strictly adds items to the general library. Does not touch Vault status.
export async function createCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const name = formData.get("name");
  const price = formData.get("price");
  const image = formData.get("image");
  const brandId = formData.get("brandId");
  const rarity = formData.get("rarity");

  if (!name || !price || !brandId) throw new Error("Missing required fields");

  try {
    await Card.create({
      name,
      price: Number(price),
      image: image || "https://via.placeholder.com/400x560?text=No+Image",
      brand: brandId,
      rarity: rarity || "Common", 
      isVault: false, // Always starts as standard inventory
      vaultReleaseDate: null,
      vaultExpiryDate: null,
    });
  } catch (error) {
    console.error("Database Error (Card):", error);
    throw new Error("Failed to create card.");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?success=true");
}

// --- 3. VAULT COMMAND & CONTROL LOGIC ---
// Handles activation, deactivation, and time-frame scheduling.
export async function updateVaultStatus(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const cardId = formData.get("cardId");
  const actionType = formData.get("actionType"); // "deactivate" | "update"
  
  // Capture dates from the dashboard inputs
  const releaseRaw = formData.get("vaultReleaseDate");
  const expiryRaw = formData.get("vaultExpiryDate");

  try {
    if (actionType === "deactivate") {
      // KILL SWITCH: Remove from vault immediately
      await Card.findByIdAndUpdate(cardId, {
        isVault: false,
        vaultReleaseDate: null,
        vaultExpiryDate: null
      });
    } else {
      // ACTIVATE / UPDATE: Set schedule
      await Card.findByIdAndUpdate(cardId, {
        isVault: true,
        // If they provided a date, use it. If not, default to NOW (immediate release).
        vaultReleaseDate: releaseRaw ? new Date(releaseRaw as string) : new Date(),
        // If they provided an expiry, set it. Otherwise null (indefinite).
        vaultExpiryDate: expiryRaw ? new Date(expiryRaw as string) : null,
      });
    }

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Database Error (Vault Update):", error);
    throw new Error("Failed to update vault status.");
  }
}