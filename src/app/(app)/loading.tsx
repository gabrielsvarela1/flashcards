export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="A carregar">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
      ))}
    </div>
  );
}
