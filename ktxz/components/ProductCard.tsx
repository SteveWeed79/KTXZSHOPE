import Image from "next/image";
import Link from "next/link";
import VaultTimer from "./VaultTimer";

interface ProductCardProps {
  card: {
    _id: string;
    name: string;
    image?: string;
    price: number;
    rarity?: string;
    brand?: { name: string } | null;
    isVault?: boolean;
    vaultExpiryDate?: string | Date | null;
  };
}

const ProductCard: React.FC<ProductCardProps> = ({ card }) => {
  const hasExpiry = !!card.vaultExpiryDate;
  const expiryDate = hasExpiry ? new Date(card.vaultExpiryDate as string | Date) : null;
  const expiryIsValid = !!expiryDate && !isNaN(expiryDate.getTime());

  return (
    <Link href={`/card/${card._id}`} className="block group relative">
      {/* Featured Status/Timer */}
      {card.isVault && expiryIsValid && expiryDate && (
        <div className="absolute top-3 left-3 z-20">
          <VaultTimer expiryDate={expiryDate} />
        </div>
      )}

      {card.isVault && (!hasExpiry || !expiryIsValid) && (
        <div className="absolute top-3 left-3 z-20">
          <span className="text-[9px] text-white font-bold uppercase tracking-wider bg-primary px-2 py-1 rounded">
            Featured
          </span>
        </div>
      )}

      <div className="relative w-full aspect-[2.5/3.5] overflow-hidden rounded-medium-soft bg-muted border border-transparent group-hover:border-primary transition-all duration-300 elevation-card">
        <Image
          src={card.image || "/placeholder-card.png"}
          alt={card.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {card.isVault && (
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent pointer-events-none" />
        )}
      </div>

      <div className="mt-4 text-left">
        <h3 className="text-foreground font-black text-base uppercase leading-tight group-hover:text-primary transition-colors tracking-widest">
          {card.name}
        </h3>
        <p className="text-muted-foreground text-[10px] font-mono uppercase mt-1 tracking-widest">
          {card.rarity} / {card.brand?.name}
        </p>
        <p className="text-lg mt-1 brand-price">${card.price.toFixed(2)}</p>
      </div>
    </Link>
  );
};

export default ProductCard;
