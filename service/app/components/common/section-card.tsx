export default function SectionCard({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border bg-card">
      <header className="flex items-end justify-between border-b px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {caption}
        </p>
      </header>
      {children}
    </section>
  );
}
