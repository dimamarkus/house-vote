import { BedDouble } from "lucide-react";
import { cn } from "../utils/cn";

interface RoomEntry {
  name: string;
  beds: string;
  imageUrl?: string | null;
}

interface RoomBreakdownGridProps {
  rooms: RoomEntry[];
  className?: string;
}

function bedCountFromText(beds: string): number {
  const matches = beds.match(/(\d+)/g);
  if (!matches) return 0;
  return matches.reduce((sum, n) => sum + parseInt(n, 10), 0);
}

function BedIcons({ count }: { count: number }) {
  const clamped = Math.min(count, 6);
  if (clamped === 0) return null;
  return (
    <div className="flex gap-0.5 text-muted-foreground/60">
      {Array.from({ length: clamped }, (_, i) => (
        <BedDouble key={i} className="h-3.5 w-3.5" />
      ))}
    </div>
  );
}

export function RoomBreakdownGrid({ rooms, className }: RoomBreakdownGridProps) {
  if (rooms.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rooms.map((room) => (
          <div key={room.name} className="space-y-1">
            <p className="text-xs font-semibold">{room.name}</p>
            <BedIcons count={bedCountFromText(room.beds)} />
            <p className="text-[11px] leading-tight text-muted-foreground">{room.beds}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
