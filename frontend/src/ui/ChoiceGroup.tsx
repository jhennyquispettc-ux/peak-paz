export interface Choice<T extends string> {
  value: T;
  label: string;
  hint: string;
}

export default function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="choice-group">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="choice">
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>
            <strong>{option.label}</strong>
            <small>{option.hint}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
