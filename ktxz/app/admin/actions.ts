"use server";

import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Brand from "@/models/Brand"; // Ensure this is imported
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * HELPER: SECURITY CHECK
 * Reusable logic to ensure only the owner can run these actions
 */
async function checkAdmin() {
  const session = await auth();
  const isAdmin = session?.user?.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) throw new Error("Unauthorized: Admin access required.");
  return session;
}

/**
 * ACTION: CREATE A NEW CARD
 */
export async function createCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const name = formData.get("name");
  const price = formData.get("price");
  const image = formData.get("image");
  const rarity = formData.get("rarity");
  const brandId = formData.get("brandId");

  if (!name || !price || !brandId) throw new Error("Missing required fields");

  try {
    await Card.create({
      name,
      price: Number(price),
      image: image || "https://via.placeholder.com/400x560?text=No+Image",
      rarity,
      brand: brandId,
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to create card.");
  }

  revalidatePath("/");
  revalidatePath("/menu/[slug]", "page");
  revalidatePath("/search");
  redirect("/admin?success=true");
}

/**
 * ACTION: DELETE A CARD
 */
export async function deleteCard(cardId: string) {
  await checkAdmin();
  await dbConnect();
  
  try {
    await Card.findByIdAndDelete(cardId);
    revalidatePath("/admin");
    revalidatePath("/menu/[slug]", "page");
    return { success: true };
  } catch (error) {
    throw new Error("Failed to delete card.");
  }
}

/** * ACTION: CREATE A NEW BRAND
 */
export async function createBrand(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const name = formData.get("name") as string;
  if (!name) throw new Error("Brand name is required");

  // Create a URL-friendly slug (e.g., "One Piece" -> "one-piece")
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

  try {
    await Brand.create({ name, slug });
    revalidatePath("/", "layout"); // Refreshes the Nav Bar
    return { success: true };
  } catch (error) {
    console.error("Brand Creation Error:", error);
    return { error: "Brand already exists or database error." };
  }
}