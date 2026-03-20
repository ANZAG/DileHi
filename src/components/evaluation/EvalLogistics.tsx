import { Car, Truck, ShoppingCart, UtensilsCrossed } from "lucide-react";

interface Props {
  carsCount: number;
  canTowCount: number;
  trailerCount: number;
  shoppers: number;
  kitchenHelpers: number;
}

export default function EvalLogistics({ carsCount, canTowCount, trailerCount, shoppers, kitchenHelpers }: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-6 mb-6">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Truck size={16} /> Logistik
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5"><Car size={14} className="text-muted-foreground" /> PKW</span>
            <span className="font-medium">{carsCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5"><Car size={14} className="text-muted-foreground" /> PKW mit Anhängerkupplung</span>
            <span className="font-medium">{canTowCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5"><Truck size={14} className="text-muted-foreground" /> Anhänger</span>
            <span className="font-medium">{trailerCount}</span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <UtensilsCrossed size={16} /> Küche
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5"><ShoppingCart size={14} className="text-muted-foreground" /> Einkäufer</span>
            <span className="font-medium">{shoppers}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5"><UtensilsCrossed size={14} className="text-muted-foreground" /> Küchenteam</span>
            <span className="font-medium">{kitchenHelpers}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
