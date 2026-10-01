import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Nav } from "./nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-background/90 backdrop-blur dark:border-neutral-800">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-2 px-4">
          <Link href="/decks" className="text-lg font-semibold tracking-tight">
            Flashcards
          </Link>
          <Nav />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        {children}
      </main>
    </div>
  );
}
