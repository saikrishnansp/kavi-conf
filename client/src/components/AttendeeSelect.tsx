import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";
import { usersApi } from "@/lib/api/users";
import { cn } from "@/lib/utils";
import { UserResponse } from "@/types/api";
import { Check, ChevronsUpDown, X } from "lucide-react";
import React, { useEffect, useState } from "react";

interface AttendeeSelectProps {
  selectedEmails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
}

const AttendeeSelect = ({
  selectedEmails,
  onChange,
  placeholder = "Select attendees...",
}: AttendeeSelectProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch] = useDebounce(searchValue, 300);
  const [searchResults, setSearchResults] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!debouncedSearch || debouncedSearch.length < 1) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const users = await usersApi.search(debouncedSearch);
        setSearchResults(users);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [debouncedSearch]);

  const handleSelect = (email: string) => {
    if (selectedEmails.includes(email)) {
      onChange(selectedEmails.filter((e) => e !== email));
    } else {
      onChange([...selectedEmails, email]);
    }
    setSearchValue("");
  };

  const handleRemove = (email: string) => {
    onChange(selectedEmails.filter((e) => e !== email));
  };

  const isEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue && isEmail(searchValue)) {
      if (!selectedEmails.includes(searchValue)) {
        handleSelect(searchValue);
      }
      setSearchValue("");
      e.preventDefault();
    }
  };

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap gap-1 mb-1'>
        {selectedEmails.map((email) => (
          <Badge key={email} variant='secondary' className='gap-1'>
            {email}
            <button
              className='ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRemove(email);
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => handleRemove(email)}
            >
              <X className='h-3 w-3 text-muted-foreground hover:text-foreground' />
            </button>
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className='w-full justify-between'
          >
            {placeholder}
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder='Search by name, email or employee ID...'
              value={searchValue}
              onValueChange={setSearchValue}
              onKeyDown={handleKeyDown}
            />
            <CommandList>
              {loading && (
                <div className='p-4 text-sm text-center'>Loading...</div>
              )}
              {!loading &&
                searchResults.length === 0 &&
                searchValue.length > 0 && (
                  <CommandEmpty>
                    {isEmail(searchValue)
                      ? `Press Enter to add external guest: ${searchValue}`
                      : "No users found."}
                  </CommandEmpty>
                )}
              <CommandGroup>
                {searchResults.map((user) => (
                  <CommandItem
                    key={user.employee_id}
                    value={user.email}
                    onSelect={() => {
                      handleSelect(user.email);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedEmails.includes(user.email)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <div className='flex flex-col'>
                      <span>
                        {user.full_name} ({user.email})
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {user.employee_id} - {user.position}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AttendeeSelect;
