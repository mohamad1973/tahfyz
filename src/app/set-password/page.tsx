import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, dashboardPath } from "@/lib/auth";
import { logoutAction, setPasswordAction } from "@/lib/actions";
import { getUserById } from "@/lib/store";

export default async function SetPasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await getUserById(session.userId);
  if (!user) redirect("/login");
  if (!user.mustSetPassword) redirect(dashboardPath(user.role));

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="font-display text-3xl font-semibold text-olive-deep">
        Tahfyz
      </Link>
      <form
        action={setPasswordAction}
        className="mt-8 w-full max-w-md space-y-3 rounded-2xl border border-line bg-card p-6"
      >
        <h1 className="font-display text-2xl text-olive-deep">Set your password</h1>
        <p className="text-sm text-ink-muted">
          Your student account was created after payment confirmation. Choose a
          password to access your dashboard.
        </p>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">New password</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-xl border border-line bg-bg px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Confirm</span>
          <input
            name="confirm"
            type="password"
            required
            minLength={6}
            className="w-full rounded-xl border border-line bg-bg px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-olive py-2.5 text-sm font-semibold text-card"
        >
          Save & continue
        </button>
      </form>
      <form action={logoutAction} className="mt-4">
        <button type="submit" className="text-sm text-ink-muted underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
