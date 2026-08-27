import * as React from "react"

import { cn, autoCapitalizeSentences } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  autoCapitalizeFirst?: boolean;
}

function Textarea({ className, autoCapitalizeFirst = true, onChange, ...props }: TextareaProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoCapitalizeFirst && typeof e.target.value === "string") {
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
    <textarea
      data-slot="textarea"
      autoCapitalize={autoCapitalizeFirst ? "sentences" : props.autoCapitalize}
      onChange={handleChange}
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
