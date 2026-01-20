import dbConnect from "@/lib/dbConnect";
import Brand from "@/models/Brand";
import FilterSidebar from "@/components/FilterSidebar";
import ProductCard from "@/components/ProductCard"; // Assuming you have this

export default async function ShopPage() {
  await dbConnect();
  const brands = await Brand.find({}).lean();
  
  // Dummy products for now - replace with your actual DB fetch
  const products = []; 

  return (
    <div className="flex flex-col lg:flex-row gap-10 py-8">
      
      {/* LEFT COLUMN: THE REFINED SEARCH */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <FilterSidebar brands={brands} />
      </div>

      {/* RIGHT COLUMN: THE RESULTS */}
      <div className="flex-1">
        <div className="flex justify-between items-end mb-8 border-b border-gray-900 pb-4">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Marketplace</h1>
            <p className="text-[10px] text-gray-500 uppercase">Showing all available transmissions</p>
          </div>
          
          <select className="bg-black border border-gray-800 text-[10px] font-bold uppercase p-2 rounded-md outline-none focus:border-red-600">
            <option>Newest Arrivals</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
          </select>
        </div>

        {products.length === 0 ? (
          <div className="h-96 border-2 border-dashed border-gray-900 rounded-3xl flex items-center justify-center text-gray-700 font-mono uppercase text-xs">
            No items found in current sector
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Products map here */}
          </div>
        )}
      </div>
    </div>
  );
}