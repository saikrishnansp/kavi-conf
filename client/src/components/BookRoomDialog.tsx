import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { bookingsApi } from "@/lib/api/bookings";
import { useAuth } from "@/contexts/AuthContext";
import { type Room, type BookingCreate } from "@/types/api";
import AttendeeSelect from "@/components/AttendeeSelect";

interface BookRoomDialogProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
}

const setDateTime = (date: Date, timeStr: string) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

export function BookRoomDialog({ room, isOpen, onClose }: BookRoomDialogProps) {
  const { googleToken } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    dates: [] as Date[],
    startTime: "09:00",
    endTime: "10:00",
    attendeeEmails: [] as string[],
  });

  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        subject: "",
        description: "",
        dates: [new Date()],
        startTime: "09:00",
        endTime: "10:00",
        attendeeEmails: [],
      });
    }
  }, [isOpen]);

  const createBookingMutation = useMutation({
    mutationFn: (data: BookingCreate) =>
      bookingsApi.create(data, googleToken || undefined),
    onSuccess: () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["publicBookings"] });
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
      toast.success("BOOKING CONFIRMED", {
        description: "Your meeting has been scheduled successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast.error("BOOKING FAILED", {
        description: error.message || "An error occurred while creating the booking.",
      });
    },
    onSettled: () => {
      setIsBooking(false);
    }
  });

  const handleBook = async () => {
    if (!room || formData.dates.length === 0 || !formData.startTime || !formData.endTime || !formData.subject) {
      toast.error("MISSING DATA", {
        description: "Please fill in all required fields.",
      });
      return;
    }

    if (formData.attendeeEmails.length === 0) {
      toast.error("MISSING ATTENDEES", {
        description: "Please add at least one attendee.",
      });
      return;
    }

    setIsBooking(true);

    const sortedDates = [...formData.dates].sort((a, b) => a.getTime() - b.getTime());
    const firstDate = sortedDates[0];
    const otherDates = sortedDates.slice(1);

    const start = setDateTime(firstDate, formData.startTime).toISOString();
    const end = setDateTime(firstDate, formData.endTime).toISOString();

    const bookingData: BookingCreate = {
      room_id: room.room_id,
      start_time: start,
      end_time: end,
      subject: formData.subject,
      description: formData.description,
      attendees: formData.attendeeEmails,
      additional_dates: otherDates.map(d => setDateTime(d, formData.startTime).toISOString()),
    };

    createBookingMutation.mutate(bookingData);
  };

  if (!room) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-pixel text-sm text-primary">BOOK ROOM: {room.room_id}</DialogTitle>
          <DialogDescription className="font-retro text-lg">
            Enter meeting details for this room.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="subject" className="font-retro text-lg">MEETING SUBJECT *</Label>
            <Input
              id="subject"
              placeholder="e.g., Sprint Planning, Client Demo..."
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="font-retro"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="font-retro text-lg">DATE(S) *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      formData.dates.length === 0 && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dates.length === 0
                      ? "Select date(s)"
                      : formData.dates.length === 1
                        ? format(formData.dates[0], "PPP")
                        : `${formData.dates.length} dates selected`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={formData.dates}
                    onSelect={(selected) => setFormData({ ...formData, dates: selected || [] })}
                    disabled={(d) => d < startOfDay(new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {formData.dates.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {formData.dates.sort((a, b) => a.getTime() - b.getTime()).map((d) => (
                    <Badge key={d.toISOString()} variant="secondary" className="text-[10px]">
                      {format(d, "MMM d")}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label className="font-retro text-lg">ATTENDEES *</Label>
              <AttendeeSelect
                selectedEmails={formData.attendeeEmails}
                onChange={(emails) => setFormData({ ...formData, attendeeEmails: emails })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime" className="font-retro text-lg">START TIME *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="pl-10 font-mono"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endTime" className="font-retro text-lg">END TIME *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="pl-10 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description" className="font-retro text-lg">DESCRIPTION (OPTIONAL)</Label>
            <Textarea
              id="description"
              placeholder="Additional notes or meeting agenda..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="font-retro"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isBooking}>
            CANCEL
          </Button>
          <Button variant="neon" onClick={handleBook} disabled={isBooking}>
            {isBooking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                BOOKING...
              </>
            ) : (
              "CONFIRM BOOKING"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
