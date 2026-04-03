import type { ComponentPropsWithoutRef } from "react";
import { FormField } from "../FormField";
import { Textarea } from "../../shadcn/textarea";

type TextareaFieldProps = ComponentPropsWithoutRef<typeof Textarea> & {
  error?: string;
  helperText?: string;
  label: string;
};

export function TextareaField({
  error,
  helperText,
  id,
  label,
  name,
  required,
  ...props
}: TextareaFieldProps) {
  const fieldName = name ?? id ?? label;

  return (
    <FormField
      error={error}
      helperText={helperText}
      label={label}
      name={fieldName}
      required={required}
    >
      <Textarea
        aria-describedby={error ? `${fieldName}-error` : undefined}
        aria-invalid={!!error}
        id={fieldName}
        name={fieldName}
        required={required}
        {...props}
      />
    </FormField>
  );
}
