import { redirect } from "next/navigation";

// O proxy envia quem não tem sessão para /login.
export default function Home() {
  redirect("/decks");
}
