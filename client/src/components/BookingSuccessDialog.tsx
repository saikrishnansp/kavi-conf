import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookingResponse } from "@/types/api";
import { CheckCircle2, Video, Calendar, ExternalLink, Share2 } from "lucide-react";
import { format } from "date-fns";

interface BookingSuccessDialogProps {
  booking: BookingResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingSuccessDialog({ booking, isOpen, onClose }: BookingSuccessDialogProps) {
  if (!booking) return null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Meeting: ${booking.subject}`,
        text: `Join our meeting at ${booking.meet_link}`,
        url: booking.meet_link || "",
      });
    } else {
      navigator.clipboard.writeText(booking.meet_link || "");
      alert("Meet link copied to clipboard!");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-2 border-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.2)]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-center font-pixel text-lg text-primary">
            BOOKING CONFIRMED!
          </DialogTitle>
          <DialogDescription className="text-center font-retro text-xl pt-2">
            "{booking.subject}" is locked and loaded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-sm border-2 border-border bg-muted/20 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-retro">ROOM</span>
              <span className="font-pixel text-[10px]">{booking.room_id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-retro">TIME</span>
              <span className="font-mono">
                {format(new Date(booking.start_time), "MMM d, HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-retro">ATTENDEES</span>
              <span className="font-retro">{booking.attendee_count} People</span>
            </div>
          </div>

          {booking.meet_link && (
            <div className="p-4 rounded-sm border-2 border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Video className="h-4 w-4" />
                <span className="font-pixel text-[10px]">GOOGLE MEET LINK</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background p-2 rounded border text-xs truncate">
                  {booking.meet_link}
                </code>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={handleShare}>
                  <Share2 className="h-3 w-3" />
                </Button>
              </div>
              <Button 
                variant="neon" 
                className="w-full h-8 text-xs"
                onClick={() => window.open(booking.meet_link!, "_blank")}
              >
                JOIN MEETING NOW
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </div>
          )}

          {booking.calendar_link && (
            <Button 
              variant="link" 
              className="w-full text-xs text-muted-foreground hover:text-primary"
              onClick={() => window.open(booking.calendar_link!, "_blank")}
            >
              <Calendar className="h-3 w-3 mr-2" />
              View in Google Calendar
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="w-full font-retro" onClick={onClose}>
            AWESOME, THANKS!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
