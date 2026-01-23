"use server";

import { revalidatePath } from "next/cache";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import dbConnect from "@/lib/dbConnect";
import { auth } from "@/auth";

// --- UTILITY: SLUG GENERATOR ---
const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

// --- SHARED SECURITY ---
async function checkAdmin() {
  const session = await auth();
  const isAdmin = 
    session?.user?.email === "steveweed1979@gmail.com" || 
    (session?.user as any)?.role === "admin";

  if (!isAdmin) throw new Error("Unauthorized: Administrative Access Required.");
}

// --- BRAND / CATEGORY ACTIONS ---

export async function createBrand(formData: FormData) {
  await checkAdmin();
  await dbConnect();
  
  const name = formData.get("name") as string;
  if (!name) throw new Error("Name required");

  const slug = slugify(name);
  const existing = await Brand.findOne({ slug });
  if (existing) throw new Error("A category with this name already exists.");

  await Brand.create({ name, slug });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteBrand(id: string) {
  await checkAdmin();
  await dbConnect();
  
  const count = await Card.countDocuments({ brand: id });
  if (count > 0) throw new Error("Cannot delete category: It still contains cards.");

  await Brand.findByIdAndDelete(id);
  revalidatePath("/admin");
}

// --- CARD ACTIONS ---

export async function createCard(formData: FormData) {
  await checkAdmin();
  await dbConnect();
  
  const rawData = Object.fromEntries(formData.entries());

  // VALIDATION: Check for brand specifically before creating
  if (!rawData.brand || rawData.brand === "") {
    throw new Error("Validation Error: You must select a Category/Brand for this card.");
  }
  
  const data = {
    ...rawData,
    price: Number(rawData.price),
    // Ensure brand is treated as a string ID
    brand: String(rawData.brand),
    isVault: rawData.isVault === "on" || rawData.isVault === "true",
    isFeatured: rawData.isFeatured === "on" || rawData.isFeatured === "true",
  };

  await Card.create(data);
  
  revalidatePath("/admin");
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function updateCard(id: string, formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const rawData = Object.fromEntries(formData.entries());

  // VALIDATION: Ensure brand isn't removed during update
  if (!rawData.brand || rawData.brand === "") {
    throw new Error("Validation Error: Brand is required.");
  }

  const data = {
    ...rawData,
    price: Number(rawData.price),
    brand: String(rawData.brand),
    isVault: rawData.isVault === "on" || rawData.isVault === "true",
    isFeatured: rawData.isFeatured === "on" || rawData.isFeatured === "true",
  };

  await Card.findByIdAndUpdate(id, data);
  
  revalidatePath("/admin");
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function deleteCard(id: string) {
  await checkAdmin();
  await dbConnect();
  
  await Card.findByIdAndDelete(id);
  
  revalidatePath("/admin");
  revalidatePath("/shop");
  revalidatePath("/");
}

// --- STATUS ACTIONS ---

export async function updateVaultStatus(id: string, isVault: boolean) {
  await checkAdmin();
  await dbConnect();
  
  await Card.findByIdAndUpdate(id, { isVault });
  
  revalidatePath("/admin");
  revalidatePath("/");
}