import { FormField } from "./FormField";
import { Input } from "./Input";

export interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  name?: string;
  autoComplete?: string;
  hint?: string;
  error?: string;
  className?: string;
}

export function Field({ label, value, onChange, hint, error, required, className, ...inputProps }: FieldProps) {
  return (
    <FormField label={label} hint={hint} error={error} required={required} className={className}>
      <Input value={value} required={required} onChange={(e) => onChange(e.target.value)} {...inputProps} />
    </FormField>
  );
}
