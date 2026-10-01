import type { ComponentProps } from "react";

export function Input({
  label,
  id,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; id: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </span>
      <input
        id={id}
        className={`min-h-11 rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 ${className}`}
        {...props}
      />
    </label>
  );
}
