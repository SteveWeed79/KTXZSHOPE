export default function FilterSidebar({ brands }: { brands: any[] }) {
  return (
    <aside className="w-64 hidden lg:flex flex-col gap-8 pr-8 border-r border-gray-900 min-h-[80vh]">
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4">Refine Search</h3>
        <div className="space-y-6">
          
          {/* Price Range */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-white">Price Range</label>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="Min" className="w-full bg-gray-900/50 border border-gray-800 p-2 rounded-lg text-xs" />
              <span className="text-gray-700">-</span>
              <input type="number" placeholder="Max" className="w-full bg-gray-900/50 border border-gray-800 p-2 rounded-lg text-xs" />
            </div>
          </div>

          {/* Game Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-white">Category</label>
            <div className="space-y-2">
              {brands.map((b) => (
                <label key={b._id} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white cursor-pointer group">
                  <input type="checkbox" className="accent-[var(--ktx-red)]" />
                  <span className="group-hover:translate-x-1 transition-transform">{b.name}</span>
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>
    </aside>
  );
}