import Link from 'next/link';

interface ProductCardProps {
  card: {
    _id: string;
    name: string;
    price: number;
    image?: string;
    rarity?: string;
    brand?: { name: string };
  };
  isVault?: boolean;
}

export default function ProductCard({ card, isVault = false }: ProductCardProps) {
  return (
    <Link href={`/card/${card._id}`} className="group relative flex flex-col">
      {/* CARD IMAGE CONTAINER */}
      <div className={`relative aspect-[2.5/3.5] w-full overflow-hidden rounded-2xl border transition-all duration-300 ${
        isVault 
        ? 'border-red-900/50 bg-black shadow-[0_0_20px_rgba(255,0,0,0.1)] group-hover:border-red-600 group-hover:shadow-[0_0_30px_rgba(255,0,0,0.2)]' 
        : 'border-gray-800 bg-gray-900/50 group-hover:border-gray-400'
      }`}>
        <img 
          src={card.image || "/placeholder-card.png"} 
          alt={card.name} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* RARITY BADGE */}
        {card.rarity && (
          <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2 py-1 rounded-md border border-gray-800">
            <p className="text-[8px] font-black uppercase tracking-tighter text-white">{card.rarity}</p>
          </div>
        )}
      </div>

      {/* CARD INFO */}
      <div className="mt-4 space-y-1">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-mono uppercase text-gray-500 tracking-widest">
              {card.brand?.name || 'Unbranded'}
            </p>
            <h3 className="font-bold text-sm uppercase italic leading-none group-hover:text-red-600 transition-colors">
              {card.name}
            </h3>
          </div>
          <p className="text-red-600 font-mono font-bold text-sm tracking-tighter">
            ${card.price.toLocaleString()}
          </p>
        </div>
      </div>
    </Link>
  );
}