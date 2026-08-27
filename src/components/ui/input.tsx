import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn, autoCapitalizeSentences } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  autoCapitalizeFirst?: boolean;
}

function Input({ className, type, autoCapitalizeFirst = true, onChange, ...props }: InputProps) {
  // Disable auto-capitalization for specific non-text/email/password/number types
  const shouldAutoCap =
    autoCapitalizeFirst &&
    type !== "password" &&
    type !== "email" &&
    type !== "number" &&
    type !== "url" &&
    type !== "date" &&
    type !== "time" &&
    type !== "file" &&
    type !== "color";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (shouldAutoCap && typeof e.target.value === "string") {
      const original = e.target.value;
      const capitalized = autoCapitalizeSentences(original);
      if (original !== capitalized) {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = capitalized;
        if (start !== null && end !== null) {
          e.target.setSelectionRange(start, end);
        }
      }
    }
    onChange?.(e);
  };

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      autoCapitalize={shouldAutoCap ? "sentences" : props.autoCapitalize}
      onChange={handleChange}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
