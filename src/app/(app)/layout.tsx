import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "./actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { email } = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-background/90 backdrop-blur dark:border-neutral-800">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <Link href="/decks" className="text-lg font-semibold tracking-tight">
            Flashcards
          </Link>
          <form action={signOut} className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-neutral-500 sm:inline">
              {email}
            </span>
            <button
              type="submit"
              className="min-h-11 rounded-lg px-3 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        {children}
      </main>
    </div>
  );
}
