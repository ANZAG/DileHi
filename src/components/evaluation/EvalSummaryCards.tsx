import { Users, Tent, Bed, Car } from "lucide-react";

interface Props {
  responsesCount: number;
  tentsCount: number;
  totalCapacity: number;
  carsCount: number;
  totalSeats: number;
}

export default function EvalSummaryCards({ responsesCount, tentsCount, totalCapacity, carsCount, totalSeats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <SummaryCard icon={<Users size={20} />} label="Anmeldungen" value={responsesCount} />
      <SummaryCard icon={<Tent size={20} />} label="Zelte" value={tentsCount} />
      <SummaryCard icon={<Bed size={20} />} label="Schlafplätze" value={totalCapacity} />
      <SummaryCard icon={<Car size={20} />} label={`PKW (${totalSeats} Plätze)`} value={carsCount} />
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="border rounded-lg p-3 text-center">
      <div className="flex justify-center text-muted-foreground mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
