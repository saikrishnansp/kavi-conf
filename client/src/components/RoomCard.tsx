import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Layers, ArrowRight, Lamp } from "lucide-react";
import type { Room } from "@/types/api";

interface RoomCardProps {
  room: Room;
  onBook?: (room: Room) => void;
}

export function RoomCard({ room, onBook }: RoomCardProps) {
  const currentBooking = room.current_booking;
  const status = currentBooking ? "BOOKED" : "AVAILABLE";
  
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const nextAvailable = currentBooking ? formatTime(currentBooking.end_time) : "NOW";

  return (
    <Card className="group relative overflow-hidden hover:neon-box transition-all duration-300">
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/20 to-transparent" />
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base leading-tight font-pixel">{room.room_id}</CardTitle>
          <Badge
            variant={status === "AVAILABLE" ? "default" : "destructive"}
            className="font-retro text-xs"
          >
            {status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-retro text-xl">{room.capacity} SEATS</span>
            </div>
            {room.is_split && (
              <div className="flex items-center gap-2 text-secondary">
                <Layers className="h-5 w-5" />
                <span className="font-retro text-lg">SPLIT</span>
              </div>
            )}
          </div>

          {room.amenities && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Lamp className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <span className="font-retro text-sm line-clamp-2">{room.amenities}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm font-retro">
          <span className="text-muted-foreground">Next available:</span>
          <span className="text-primary">{nextAvailable}</span>
        </div>

        {/* Retro pixel divider */}
        <div className="h-1 bg-gradient-to-r from-primary via-secondary to-accent opacity-50" />

        <Button
          variant="neon"
          className="w-full group-hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBook?.(room);
          }}
          disabled={!room.is_active}
        >
          BOOK NOW
          <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
