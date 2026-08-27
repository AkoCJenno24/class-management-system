import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  keywords?: string[]
  subtext?: string
  badge?: React.ReactNode
  icon?: React.ReactNode
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  allowCustomValue?: boolean
  disabled?: boolean
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  allowCustomValue = false,
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedOption = options.find(
    (option) => option.value.toLowerCase() === value.toLowerCase()
  )

  const displayLabel = selectedOption
    ? selectedOption.label
    : value
    ? value
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal text-left h-9 px-3 cursor-pointer",
              !value && "text-muted-foreground",
              className
            )}
          >
            <div className="flex items-center gap-2 truncate">
              {selectedOption?.icon}
              <span className="truncate">{displayLabel}</span>
              {selectedOption?.badge}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-60">
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
              <p>{emptyText}</p>
              {allowCustomValue && search.trim() && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2 text-xs text-primary"
                  onClick={() => {
                    onValueChange(search.trim())
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  Use "{search.trim()}"
                </Button>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected =
                  value.toLowerCase() === option.value.toLowerCase()

                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.keywords?.join(" ") || ""}`}
                    onSelect={() => {
                      onValueChange(option.value)
                      setOpen(false)
                      setSearch("")
                    }}
                    className="flex items-center justify-between gap-2 cursor-pointer py-2 px-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {option.icon}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-medium text-sm">
                          {option.label}
                        </span>
                        {option.subtext && (
                          <span className="truncate text-xs text-muted-foreground">
                            {option.subtext}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {option.badge}
                      <Check
                        className={cn(
                          "h-4 w-4 text-primary transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
