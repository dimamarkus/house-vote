import type { ComponentPropsWithoutRef } from "react";
import { FormField } from "../FormField";
import { Input } from "../../shadcn/input";

type InputFieldProps = ComponentPropsWithoutRef<typeof Input> & {
  error?: string;
  helperText?: string;
  label: string;
};

export function InputField({
  error,
  helperText,
  id,
  label,
  name,
  required,
  ...props
}: InputFieldProps) {
  const fieldName = name ?? id ?? label;

  return (
    <FormField
      error={error}
      helperText={helperText}
      label={label}
      name={fieldName}
      required={required}
    >
      <Input
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
