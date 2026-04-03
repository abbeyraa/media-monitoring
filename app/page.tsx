import { redirect } from "next/navigation";

import { requireSession } from "@/lib/server-auth";

export default async function Home() {
  const session = await requireSession();

  redirect(session ? "/dashboard" : "/login");
}
