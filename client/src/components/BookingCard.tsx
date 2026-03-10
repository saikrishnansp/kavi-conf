import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, X } from "lucide-react";
import { format } from "date-fns";
import type { BookingResponse } from "@/types/api";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BookingCardProps {
  booking: BookingResponse;
  onCancel?: (booking: BookingResponse) => void;
}

const statusColors = {
  confirmed: "bg-neon-green/20 text-neon-green border-neon-green",
  cancelled: "bg-destructive/20 text-destructive border-destructive",
  completed: "bg-muted text-muted-foreground border-muted",
};

const statusLabels = {
  confirmed: "CONFIRMED",
  cancelled: "CANCELLED",
  completed: "COMPLETED",
};

export function BookingCard({ booking, onCancel }: BookingCardProps) {
  const startDate = new Date(booking.start_time);
  const endDate = new Date(booking.end_time);

  return (
    <Card className="relative overflow-hidden">
      {/* Status indicator bar */}
      <div
        className={`absolute top-0 left-0 w-1 h-full ${
          booking.status === "confirmed"
            ? "bg-neon-green"
            : booking.status === "cancelled"
            ? "bg-destructive"
            : "bg-muted-foreground"
        }`}
      />

      <CardHeader className="pb-2 pl-6">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-sm leading-relaxed line-clamp-2">
            {booking.subject}
          </CardTitle>
          <Badge
            variant="outline"
            className={`font-retro text-xs shrink-0 ${statusColors[booking.status]}`}
          >
            {statusLabels[booking.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pl-6 space-y-3">
        {booking.description && (
          <p className="font-retro text-lg text-muted-foreground line-clamp-2">
            {booking.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-retro text-lg">{format(startDate, "MMM dd")}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <Clock className="h-4 w-4 text-secondary" />
            <span className="font-retro text-lg">
              {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
            </span>
          </div>
        </div>

        {booking.attendees.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-muted-foreground cursor-help">
                  <Users className="h-4 w-4" />
                  <span className="font-retro text-base hover:text-foreground transition-colors">
                    {booking.attendee_count} ATTENDEE{booking.attendee_count !== 1 ? "S" : ""}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-popover border-2 border-primary">
                <ul className="space-y-1 p-1">
                  {booking.attendees.map((a) => (
                    <li key={a.email} className="font-retro text-sm flex flex-col">
                      <span className="text-primary">{a.full_name}</span>
                      <span className="text-xs text-muted-foreground">{a.email}</span>
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {booking.status === "confirmed" && onCancel && (
          <Button
            variant="destructive"
            size="sm"
            className="w-full mt-2"
            onClick={() => onCancel(booking)}
          >
            <X className="h-4 w-4 mr-2" />
            CANCEL BOOKING
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
