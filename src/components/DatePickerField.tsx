'use client';

import { FormField } from '@turbodima/ui/form/FormField';
import { Input } from '@turbodima/ui/shadcn/input';
import { useFormStatus } from 'react-dom';

interface DatePickerFieldProps {
  name: string;
  label: string;
  defaultValue?: Date | string;
  error?: string;
  helperText?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function DatePickerField({
  name,
  label,
  defaultValue,
  error,
  helperText,
  required = false,
  className,
}: DatePickerFieldProps) {
  const { pending } = useFormStatus();
  const normalizedDefaultValue =
    defaultValue instanceof Date
      ? (defaultValue.toISOString().split('T')[0] ?? '')
      : typeof defaultValue === 'string'
        ? defaultValue
        : '';

  return (
    <FormField
      name={name}
      label={label}
      helperText={helperText}
      error={error}
      required={required}
      className={className}
    >
      <Input
        type="date"
        id={name}
        name={name}
        defaultValue={normalizedDefaultValue}
        disabled={pending}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
    </FormField>
  );
}