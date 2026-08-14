"use client";

import { useEffect } from "react";

/** Unregisters leftover PWA service workers so the site stays browser-only. */
export function UnregisterSw() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      } catch {
        /* ignore */
      }

      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return null;
}
