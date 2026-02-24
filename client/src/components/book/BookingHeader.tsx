import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BookingHeaderProps {
  googleToken: string | null;
}

const BookingHeader = ({ googleToken }: BookingHeaderProps) => {
  if (googleToken) return null;

  return (
    <Alert variant="destructive" className="mb-6 border-2 border-destructive bg-destructive/10 animate-pulse">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-pixel text-xs">GOOGLE CALENDAR DISCONNECTED</AlertTitle>
      <AlertDescription className="font-retro text-sm">
        You are not signed in with Google. Calendar invites and Meet links will NOT be generated.
      </AlertDescription>
    </Alert>
  );
};

export default BookingHeader;
