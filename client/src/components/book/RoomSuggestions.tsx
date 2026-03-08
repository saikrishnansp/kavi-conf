import { CheckCircle, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Room } from "@/types/api";

interface RoomSuggestionsProps {
  attendeeCount: number;
  suggestedRooms: any[];
  selectedRoom: Room | null;
  isRoomAvailable: (room: any) => boolean;
  setForm: (updates: any) => void;
}

const RoomSuggestions = ({
  attendeeCount,
  suggestedRooms,
  selectedRoom,
  isRoomAvailable,
  setForm,
}: RoomSuggestionsProps) => {
  return (
    <Card className='mb-6'>
      <CardHeader className='pb-4'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center justify-center w-8 h-8 rounded-sm bg-secondary text-secondary-foreground font-pixel text-sm'>
            2
          </div>
          <CardTitle className='text-lg'>SELECT A ROOM</CardTitle>
          {suggestedRooms.length > 0 && (
            <Badge variant='outline' className='ml-auto'>
              <Sparkles className='h-3 w-3 mr-1' />
              SUGGESTED FOR {attendeeCount} PEOPLE
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {attendeeCount > 0 ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {suggestedRooms.map((room) => {
              const available = isRoomAvailable(room);
              const isSelected = selectedRoom?.room_id === room.room_id;

              return (
                <button
                  key={room.room_id}
                  onClick={() =>
                    available && setForm({ selectedRoom: room })
                  }
                  disabled={!available}
                  className={cn(
                    "p-4 rounded-sm border-2 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 neon-box"
                      : available
                        ? "border-border hover:border-primary/50 bg-card"
                        : "border-border/50 bg-muted/20 opacity-60 cursor-not-allowed",
                  )}
                >
                  <div className='flex items-start justify-between mb-2'>
                    <span className='font-pixel text-sm'>
                      {room.room_id}
                    </span>
                    {isSelected && (
                      <CheckCircle className='h-5 w-5 text-primary' />
                    )}
                  </div>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Users className='h-4 w-4 text-primary' />
                      <span className='font-retro text-lg'>
                        {room.capacity} seats
                      </span>
                    </div>
                    <Badge
                      variant={available ? "default" : "secondary"}
                      className='text-xs'
                    >
                      {available ? "AVAILABLE" : "BOOKED"}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className='text-center py-8 text-muted-foreground'>
            <Users className='h-8 w-8 mx-auto mb-2 opacity-50' />
            <p className='font-retro text-xl'>
              Add attendees to see room suggestions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoomSuggestions;
