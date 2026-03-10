import { format } from "date-fns";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { timeSlots } from "@/lib/constants";
import { RoomWithBookings, BookedSlot } from "../types";

interface GridTabProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  rooms: RoomWithBookings[];
  currentTime: string;
  isSlotBooked: (room: RoomWithBookings, time: string) => BookedSlot | undefined;
}

export const GridTab = ({
  selectedDate,
  onDateChange,
  rooms,
  currentTime,
  isSlotBooked,
}: GridTabProps) => {
  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='pb-2'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-base flex items-center gap-2'>
              <Clock className='h-5 w-5 text-primary' />
              {format(selectedDate, "yyyy-MM-dd") ===
              format(new Date(), "yyyy-MM-dd")
                ? "TODAY'S SCHEDULE"
                : `SCHEDULE FOR ${format(selectedDate, "MMM d, yyyy")}`}
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='end'>
                <Calendar
                  mode='single'
                  selected={selectedDate}
                  onSelect={(date) => date && onDateChange(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <div className='min-w-[800px]'>
            {/* Time header */}
            <div className='flex border-b-2 border-border'>
              <div className='w-36 shrink-0 p-2 font-retro text-lg text-muted-foreground'>
                ROOM
              </div>
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className={cn(
                    "flex-1 p-2 text-center font-retro text-sm border-l border-border",
                    time === currentTime && "bg-primary/10",
                  )}
                >
                  {time}
                </div>
              ))}
            </div>

            {/* Room rows */}
            {rooms.map((room) => (
              <div
                key={room.room_id}
                className='flex border-b border-border hover:bg-muted/5'
              >
                <div className='w-36 shrink-0 p-3'>
                  <p className='font-pixel text-xs truncate'>
                    {room.room_id}
                  </p>
                  <p className='font-retro text-[10px] text-muted-foreground uppercase'>
                    {room.capacity} seats
                  </p>
                  {/* {room.amenities && (
                     <p className='font-retro text-[10px] text-accent truncate mt-1' title={room.amenities}>
                       {room.amenities}
                     </p>
                  )} */}
                </div>
                {timeSlots.map((time) => {
                  const booking = isSlotBooked(room, time);
                  const isCurrent = time === currentTime;

                  return (
                    <div
                      key={time}
                      className={cn(
                        "flex-1 p-1 border-l border-border relative",
                        isCurrent && "bg-primary/5",
                      )}
                    >
                      {booking ? (
                        <div
                          className='h-full min-h-[40px] rounded-sm bg-destructive/20 border border-destructive/30 p-1 cursor-help'
                          title={`${booking.subject} - Booked by: ${booking.bookedBy}`}
                        >
                          <span className='font-retro text-xs text-destructive truncate block'>
                            {booking.subject}
                          </span>
                        </div>
                      ) : (
                        <div className='h-full min-h-[40px] rounded-sm bg-primary/10 border border-primary/20' />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className='flex items-center gap-6 mt-4 pt-4 border-t border-border'>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 rounded-sm bg-primary/20 border border-primary/30' />
              <span className='font-retro text-sm text-muted-foreground'>
                Available
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 rounded-sm bg-destructive/20 border border-destructive/30' />
              <span className='font-retro text-sm text-muted-foreground'>
                Booked
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 rounded-sm bg-primary/10 border-2 border-primary' />
              <span className='font-retro text-sm text-muted-foreground'>
                Current Hour
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
