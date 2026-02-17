import { createContext, useContext, useState, ReactNode } from "react";
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

  const setForm = (updates: Partial<BookingFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  };

  const resetForm = () => setFormState(initialState);

  return (
    <BookingContext.Provider value={{ form, setForm, resetForm }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBookingForm = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBookingForm must be used within BookingProvider");
  return ctx;
};
