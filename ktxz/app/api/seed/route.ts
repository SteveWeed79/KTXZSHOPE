import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Card from "@/models/Card";
import Brand from "@/models/Brand";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  // Block unless explicitly in development mode
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Seed only available in development" }, { status: 403 });
  }

  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  try {
    await dbConnect();

    // 1. Create Game Categories (Brands)
    // We use findOneAndUpdate with upsert so you can run this multiple times without duplicates
    const brandNames = ["POKÉMON TCG", "MAGIC: THE GATHERING", "YU-GI-OH!", "ONE PIECE CG"];
    const brandDocs = [];

    for (const name of brandNames) {
      const brand = await Brand.findOneAndUpdate(
        { name },
        { name, slug: name.toLowerCase().replace(/[:!]/g, '').replace(/\s+/g, '-') },
        { upsert: true, new: true }
      );
      brandDocs.push(brand);
    }

    // 2. Clear existing test cards to prevent clutter
    await Card.deleteMany({ name: /Elite Asset/ });

    // 3. Generate 20 Random Cards
    const sampleCards = [];
    for (let i = 1; i <= 20; i++) {
      const randomBrand = brandDocs[Math.floor(Math.random() * brandDocs.length)];
      const isVaultItem = i <= 4; 

      sampleCards.push({
        name: `Elite Asset #${1000 + i}`,
        price: Math.floor(Math.random() * 500) + 50,
        image: `https://picsum.photos/seed/${i + 123}/400/560`, 
        brand: randomBrand._id,
        rarity: i % 3 === 0 ? "GHOST RARE" : "ULTRA RARE",
        isVault: isVaultItem,
        vaultReleaseDate: isVaultItem ? new Date() : null,
        vaultExpiryDate: isVaultItem ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      });
    }

    await Card.insertMany(sampleCards);

    return NextResponse.json({ 
      success: true, 
      message: `Seeded ${brandDocs.length} categories and 20 cards successfully.` 
    });
  } catch (error: unknown) {
    console.error("Seed Error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}