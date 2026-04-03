import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { requireSession } from "@/lib/server-auth";

export default async function LoginPage() {
  const session = await requireSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Internal Access
          </p>
          <h1 className="text-3xl font-semibold text-zinc-950">Login</h1>
          <p className="text-sm text-zinc-600">
            Masuk dulu untuk membuka dashboard monitoring media sosial.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
