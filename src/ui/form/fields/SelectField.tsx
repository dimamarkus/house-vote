import type { ComponentPropsWithoutRef } from "react";
import { FormField } from "../FormField";
import { cn } from "../../utils/cn";

export interface SelectOption {
  label: string;
  value: string;
}

type SelectFieldProps = Omit<ComponentPropsWithoutRef<"select">, "children"> & {
  error?: string;
  helperText?: string;
  label: string;
  options: ReadonlyArray<SelectOption>;
  placeholder?: string;
};

export function SelectField({
  className,
  error,
  helperText,
  id,
  label,
  name,
  options,
  placeholder,
  required,
  ...props
}: SelectFieldProps) {
  const fieldName = name ?? id ?? label;

  return (
    <FormField
      error={error}
      helperText={helperText}
      label={label}
      name={fieldName}
      required={required}
    >
      <select
        aria-describedby={error ? `${fieldName}-error` : undefined}
        aria-invalid={!!error}
        id={fieldName}
        name={fieldName}
        required={required}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
