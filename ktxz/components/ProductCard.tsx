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
      {/* Vault Status/Timer */}
      {card.isVault && expiryIsValid && expiryDate && (
        <div className="absolute top-3 left-3 z-20">
          <VaultTimer expiryDate={expiryDate} />
        </div>
      )}

      {card.isVault && (!hasExpiry || !expiryIsValid) && (
        <div className="absolute top-3 left-3 z-20">
          <span className="text-[9px] text-primary font-bold uppercase tracking-wider bg-primary/10 backdrop-blur-sm border border-primary/30 px-2 py-1 rounded">
            Vault Active
          </span>
        </div>
      )}

      <div className="relative w-full aspect-[2.5/3.5] overflow-hidden rounded-xl bg-muted border border-border group-hover:border-primary transition-all duration-300">
        <img
          src={card.image || "/placeholder-card.png"}
          alt={card.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {card.isVault && (
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent pointer-events-none" />
        )}
      </div>

      <div className="mt-4 text-left">
        <h3 className="text-foreground font-bold text-base uppercase leading-tight group-hover:text-primary transition-colors tracking-tight">
          {card.name}
        </h3>
        <p className="text-muted-foreground text-[10px] font-mono uppercase mt-1 tracking-widest">
          {card.rarity} / {card.brand?.name}
        </p>
        <p className="text-foreground font-bold text-lg mt-1">${card.price.toFixed(2)}</p>
      </div>
    </Link>
  );
};

export default ProductCard;
