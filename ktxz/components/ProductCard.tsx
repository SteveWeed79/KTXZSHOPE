// ktxz/components/ProductCard.tsx
import Link from "next/link";
import VaultTimer from "./VaultTimer"; 

interface ProductCardProps {
  card: {
    _id: string;
    name: string;
    image: string;
    price: number;
    rarity: string;
    brand: { name: string };
    isVault?: boolean;
    vaultExpiryDate?: Date;
  };
}

const ProductCard: React.FC<ProductCardProps> = ({ card }) => {
  return (
    <Link href={`/card/${card._id}`} className="block group relative">
      {/* Vault Status/Timer - Only show if it's a Vault card */}
      {card.isVault && card.vaultExpiryDate && (
        <div className="absolute top-3 left-3 z-20">
          <VaultTimer expiryDate={card.vaultExpiryDate} />
        </div>
      )}
      
      {card.isVault && !card.vaultExpiryDate && (
        <div className="absolute top-3 left-3 z-20">
          <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider bg-red-950/80 backdrop-blur-sm border border-red-500/30 px-2 py-1 rounded">
            Vault Active
          </span>
        </div>
      )}

      {/* 1. aspect-[2.5/3.5] enforces the vertical card shape on all screens.
          2. Removed h-80 to allow the aspect ratio to control height.
      */}
      <div className="relative w-full aspect-[2.5/3.5] overflow-hidden rounded-xl bg-gray-900 border border-gray-800 group-hover:border-red-600 transition-all duration-300">
        <img
          src={card.image || "/placeholder-card.png"} 
          alt={card.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Subtle Vault Glow Overlay */}
        {card.isVault && (
          <div className="absolute inset-0 bg-gradient-to-t from-red-950/40 via-transparent to-transparent pointer-events-none" />
        )}
      </div>

      <div className="mt-4 text-left">
        <h3 className="text-white font-black text-base uppercase leading-tight group-hover:text-red-600 transition-colors italic tracking-tighter">
          {card.name}
        </h3>
        <p className="text-gray-500 text-[10px] font-mono uppercase mt-1 tracking-widest">
          {card.rarity} // {card.brand?.name}
        </p>
        <p className="text-white font-bold text-lg mt-1">
          ${card.price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
};

export default ProductCard;