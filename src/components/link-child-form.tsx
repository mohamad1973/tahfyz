"use client";

import { useState, useTransition } from "react";
import { linkChildAction } from "@/lib/actions";

export function LinkChildForm() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setError(null);
        setOk(false);
        start(async () => {
          const res = await linkChildAction(fd);
          if (!res.ok) setError(res.error);
          else setOk(true);
        });
      }}
      className="mt-3 flex flex-col gap-2 sm:flex-row"
    >
      <input
        name="email"
        type="email"
        required
        placeholder="Student email"
        className="flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-olive px-4 py-2 text-sm font-semibold text-card disabled:opacity-60"
      >
        Link child
      </button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
      {ok && (
        <p className="w-full text-sm text-ok">Child linked successfully.</p>
      )}
    </form>
  );
}
