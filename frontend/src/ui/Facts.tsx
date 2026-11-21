import type { ReactNode } from 'react';

export interface Fact {
  label: string;
  value: ReactNode;
}

export default function Facts({ items }: { items: Fact[] }) {
  return (
    <dl className="facts">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
