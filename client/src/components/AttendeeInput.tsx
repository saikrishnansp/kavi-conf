import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, X } from "lucide-react";

interface Attendee {
  id: string;
  value: string;
}

interface AttendeeInputProps {
  attendees: Attendee[];
  onChange: (attendees: Attendee[]) => void;
}

const AttendeeInput = ({ attendees, onChange }: AttendeeInputProps) => {
  const [inputValue, setInputValue] = useState("");

  const addAttendee = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (attendees.some((a) => a.value.toLowerCase() === trimmed.toLowerCase())) return;

    onChange([...attendees, { id: crypto.randomUUID(), value: trimmed }]);
    setInputValue("");
  };

  const removeAttendee = (id: string) => {
    onChange(attendees.filter((a) => a.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addAttendee();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Email, name, or employee ID"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button type="button" variant="outline" size="icon" onClick={addAttendee} disabled={!inputValue.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {attendees.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attendees.map((attendee) => (
            <Badge key={attendee.id} variant="secondary" className="gap-1 pr-1">
              {attendee.value}
              <button
                type="button"
                onClick={() => removeAttendee(attendee.id)}
                className="ml-1 rounded-sm hover:bg-muted p-0.5"
                title="Remove attendee"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground font-retro">
        {attendees.length} attendee{attendees.length !== 1 ? "s" : ""} added
      </p>
    </div>
  );
};

export default AttendeeInput;
