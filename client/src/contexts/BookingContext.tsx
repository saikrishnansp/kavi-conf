import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import type { Room } from "@/types/api";

interface BookingFormState {
  dates: Date[];
  startTime: string;
  endTime: string;
  attendees: string[];
  subject: string;
  description: string;
  selectedRoom: Room | null;
  googleEventId?: string;
  meetLink?: string;
}

interface BookingContextType {
  form: BookingFormState;
  setForm: (updates: Partial<BookingFormState>) => void;
  resetForm: () => void;
}

const initialState: BookingFormState = {
  dates: [],
  startTime: "",
  endTime: "",
  attendees: [],
  subject: "",
  description: "",
  selectedRoom: null,
  googleEventId: undefined,
  meetLink: undefined,
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [form, setFormState] = useState<BookingFormState>(initialState);

  const setForm = useCallback((updates: Partial<BookingFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => setFormState(initialState), []);

  const value = useMemo(() => ({ form, setForm, resetForm }), [form, setForm, resetForm]);

  return (
    <BookingContext value={value}>
      {children}
    </BookingContext>
  );
};

export const useBookingForm = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBookingForm must be used within BookingProvider");
  return ctx;
};
