
"use client";

import * as React from "react";
import { X, ChevronsUpDown, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = "Select...",
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const handleUnselect = (value: string) => {
    onChange(selected.filter((s) => s !== value));
  };

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredValues = filteredOptions.map(o => o.value);
      const newSelected = [...new Set([...selected, ...allFilteredValues])];
      onChange(newSelected);
    } else {
      const filteredValuesSet = new Set(filteredOptions.map(o => o.value));
      onChange(selected.filter(s => !filteredValuesSet.has(s)));
    }
  };

  const areAllFilteredSelected = filteredOptions.length > 0 && filteredOptions.every(o => selected.includes(o.value));

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setSearchTerm(''); // Reset search on close
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-[2.5rem] h-auto",
            className
          )}
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length > 0 ? (
              options
                .filter((option) => selected.includes(option.value))
                .map((option) => (
                  <Badge
                    variant="secondary"
                    key={option.value}
                    className="mr-1 mb-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnselect(option.value);
                    }}
                  >
                    {option.label}
                    <X className="ml-1 h-3 w-3 cursor-pointer" />
                  </Badge>
                ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
         <div className="p-2">
            <Input 
                placeholder="Cerca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
            />
        </div>
        <div className="flex items-center space-x-2 border-t border-b px-3 py-2">
            <Checkbox 
                id="select-all" 
                checked={areAllFilteredSelected}
                onCheckedChange={handleSelectAll}
                disabled={filteredOptions.length === 0}
            />
            <Label
                htmlFor="select-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
                Seleziona Tutto
            </Label>
        </div>
        <ScrollArea className="max-h-60">
            <div className="p-2">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() => {
                    const newSelected = isSelected
                      ? selected.filter((s) => s !== option.value)
                      : [...selected, option.value];
                    onChange(newSelected);
                  }}
                >
                    <div
                        className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                    >
                        <Check className={cn("h-4 w-4")} />
                    </div>
                  <Label
                    htmlFor={`multi-select-${option.value}`}
                    className="font-normal w-full cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              );
            }) : (
                <p className="p-2 text-center text-sm text-muted-foreground">Nessun risultato.</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelect };
