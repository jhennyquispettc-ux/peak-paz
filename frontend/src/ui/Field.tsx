import { useId } from 'react';

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  rows,
  hint,
  required,
  min,
  max,
  step,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  rows?: number;
  hint?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {rows ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          required={required}
          min={min}
          max={max}
          step={step}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
