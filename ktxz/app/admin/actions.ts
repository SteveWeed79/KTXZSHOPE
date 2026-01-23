"use server";

import { revalidatePath } from "next/cache";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import dbConnect from "@/lib/dbConnect";
import { auth } from "@/auth";

const slugify = (text: string) =>
  text.toString().toLowerCase().trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

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
  const name = formData.get("name") as string;
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

  await Card.create({
    name: rawData.name as string,
    slug: slugify(rawData.name as string),
    price: Number(rawData.price),
    description: rawData.description as string,
    rarity: rawData.rarity as string,
    image: rawData.image as string,
    brand: String(brandId),
    isVault: rawData.isVault === "on",
    isFeatured: rawData.isFeatured === "on",
    updatedAt: new Date(),
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();
  const rawData = Object.fromEntries(formData.entries());
  await Card.findByIdAndUpdate(rawData.cardId, {
    name: rawData.name as string,
    price: Number(rawData.price),
    rarity: rawData.rarity as string,
    description: rawData.description as string,
    image: rawData.image as string,
    isVault: rawData.isVault === "on",
    isFeatured: rawData.isFeatured === "on",
    updatedAt: new Date(),
  });
  revalidatePath("/admin");
}

export async function deleteCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();
  await Card.findByIdAndDelete(formData.get("cardId"));
  revalidatePath("/admin");
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
}