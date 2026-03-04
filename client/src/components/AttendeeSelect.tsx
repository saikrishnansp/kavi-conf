import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usersApi } from "@/lib/api/users";
import { UserResponse } from "@/types/api";
import { X, Search, User, Mail, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendeeSelectProps {
  selectedEmails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
}

const AttendeeSelect = ({
  selectedEmails,
  onChange,
  placeholder = "Search by name, email or employee ID...",
}: AttendeeSelectProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Task 1: Fetch and Filter Users
  const { data: users = [] } = useQuery({
    queryKey: ["users-directory"],
    queryFn: () => usersApi.getDirectory(),
  });

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return users.filter((user) => {
      // Exclude users already in the attendees array
      if (selectedEmails.includes(user.email)) return false;

      return (
        (user.full_name || "").toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.employee_id.toLowerCase().includes(query)
      );
    });
  }, [users, searchQuery, selectedEmails]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddUser = (email: string) => {
    if (!selectedEmails.includes(email)) {
      onChange([...selectedEmails, email]);
    }
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  const handleRemoveUser = (email: string) => {
    onChange(selectedEmails.filter((e) => e !== email));
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Task 3: Selected Attendees Chips */}
      {selectedEmails.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedEmails.map((email) => {
            // Try to find the user details for the badge
            const user = users.find(u => u.email === email);
            return (
              <Badge 
                key={email} 
                variant="secondary" 
                className="font-retro py-1.5 px-3 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200"
              >
                <span className="max-w-[150px] truncate">
                  {user?.full_name || email}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveUser(email)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Task 2: UI Implementation - Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="pl-10 font-retro"
          />
        </div>

        {/* Task 2: UI Implementation - Search Results Dropdown */}
        {isDropdownOpen && searchQuery.trim() !== "" && (
          <Card className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto shadow-xl border-primary/20 animate-in fade-in slide-in-from-top-2">
            <div className="p-1">
              {filteredUsers.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground font-retro text-center">
                  NO USERS FOUND
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.employee_id}
                    type="button"
                    onClick={() => handleAddUser(user.email)}
                    className="w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors rounded-sm group flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-retro text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        {user.full_name || "Unknown User"}
                      </span>
                      <span className="text-[10px] font-pixel text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        #{user.employee_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        {user.email}  
                      </span>
                      {user.position && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Hash className="h-3 w-3" />
                          {user.position}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
      
      <p className="text-[10px] font-pixel text-muted-foreground/60 uppercase">
        {selectedEmails.length} ATTENDEE{selectedEmails.length !== 1 ? "S" : ""} SELECTED
      </p>
    </div>
  );
};

export default AttendeeSelect;
