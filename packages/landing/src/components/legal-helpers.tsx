export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
      {children}
    </h2>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-text-secondary leading-relaxed mb-4">{children}</p>
  );
}

export function Li({ children }: { children: React.ReactNode }) {
  return <li className="text-text-secondary leading-relaxed">{children}</li>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc ml-6 text-text-secondary leading-relaxed mb-4 space-y-1">
      {children}
    </ul>
  );
}

export function Sub({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-medium text-text-primary mt-6 mb-3">
      {children}
    </h3>
  );
}
