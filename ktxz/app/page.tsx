//  import Image from "next/image";

// export default function Home() {
//   return (
//     <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
//       <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={100}
//           height={20}
//           priority
//         />
//         <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
//           <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
//             To get started, edit the page.tsx file.
//           </h1>
//           <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
//             Looking for a starting point or more instructions? Head over to{" "}
//             <a
//               href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Templates
//             </a>{" "}
//             or the{" "}
//             <a
//               href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Learning
//             </a>{" "}
//             center.
//           </p>
//         </div>
//         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
//           <a
//             className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={16}
//               height={16}
//             />
//             Deploy Now
//           </a>
//           <a
//             className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Documentation
//           </a>
//         </div>
//       </main>
//     </div>
//   );
// }

import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";
import Card from "@/models/Card";
import { revalidatePath } from "next/cache";

export default async function Home() {
  await dbConnect();
  const brands = await Brand.find({});

  async function seedBrands() {
    "use server";
    await dbConnect();
    const defaultBrands = [
      { name: "Pokémon", slug: "pokemon" },
      { name: "Magic: The Gathering", slug: "mtg" },
      { name: "Yu-Gi-Oh!", slug: "yugioh" }
    ];
    for (const b of defaultBrands) {
      await Brand.updateOne({ slug: b.slug }, b, { upsert: true });
    }
    revalidatePath("/");
  }

  async function seedCard() {
    "use server";
    await dbConnect();
    const pokemonBrand = await Brand.findOne({ slug: "pokemon" });
    if (pokemonBrand) {
      await Card.create({
        name: "Base Set Charizard",
        price: 499.99,
        image: "https://example.com/charizard.jpg",
        rarity: "Holo Rare",
        brand: pokemonBrand._id
      });
    }
    revalidatePath("/");
  }

  // --- NO EXTRA BRACKET HERE ---

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-24">
      <h1 className="text-6xl font-extrabold tracking-tighter mb-4">KTXZ SHOP</h1>
      
      <div className="p-6 border border-green-500 bg-green-950/10 rounded-xl text-center">
        <p className="text-green-400 font-mono text-xl mb-4">
          STATUS: {brands.length > 0 ? "LIVE DATA DETECTED" : "DATABASE EMPTY"}
        </p>
        <p className="text-3xl font-bold">{brands.length} BRANDS FOUND</p>
        
        {brands.length === 0 ? (
          <form action={seedBrands}>
            <button className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg">
              INITIALIZE BRANDS
            </button>
          </form>
        ) : (
          <form action={seedCard}>
            <button className="mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg">
              ADD CHARIZARD TO POKÉMON
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        {brands.map((brand) => (
          <div key={brand.slug} className="px-4 py-2 border border-gray-700 rounded-md bg-gray-900">
            {brand.name}
          </div>
        ))}
      </div>
    </main>
  );
}