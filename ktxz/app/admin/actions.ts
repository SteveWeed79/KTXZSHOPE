"use server";

import { auth } from "@/auth"; // We will set this up next
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * ACTION: CREATE A NEW CARD
 */
export async function createCard(formData: FormData) {
  const session = await auth();

  // 1. SECURITY BOUNCER
  if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
    throw new Error("Unauthorized");
  }

  await dbConnect();

  // 2. EXTRACT DATA
  const name = formData.get("name");
  const price = formData.get("price");
  const image = formData.get("image");
  const rarity = formData.get("rarity");
  const brandId = formData.get("brandId");

  // 3. VALIDATION
  if (!name || !price || !brandId) {
    throw new Error("Missing required fields");
  }

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

  // 4. REFRESH DATA
  // This clears the cache so the new card appears immediately everywhere
  revalidatePath("/");
  revalidatePath("/menu/[slug]", "page");
  revalidatePath("/search");
  
  redirect("/admin?success=true");
}

/**
 * ACTION: DELETE A CARD
 */
export async function deleteCard(cardId: string) {
  const session = await auth();
  
  if (!session?.user || session.user.email !== "your-email@example.com") {
    throw new Error("Unauthorized");
  }

  await dbConnect();
  
  try {
    await Card.findByIdAndDelete(cardId);
    revalidatePath("/admin");
    revalidatePath("/menu/[slug]", "page");
  } catch (error) {
    throw new Error("Failed to delete card.");
  }
}