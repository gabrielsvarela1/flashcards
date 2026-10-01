"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/decks", label: "Decks", match: ["/decks", "/review"] },
  { href: "/stats", label: "Estatísticas", match: ["/stats"] },
  { href: "/account", label: "Conta", match: ["/account"] },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Principal">
      {LINKS.map(({ href, label, match }) => {
        const active = match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-lg px-2.5 text-sm transition-colors ${
              active
                ? "font-medium text-indigo-600 dark:text-indigo-400"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
