"use client";

import { TeachersGrid } from "@/components/teacher-card";
import { useI18n } from "@/lib/i18n/provider";
import type { Teacher } from "@/lib/types";

export function TeachersPageClient({ teachers }: { teachers: Teacher[] }) {
  const { t } = useI18n();
  return (
    <>
      <h1 className="font-display text-4xl text-olive-deep sm:text-5xl">
        {t.ourTeachers}
      </h1>
      <p className="mt-3 max-w-2xl text-ink-muted">{t.teachersPageSub}</p>
      <div className="mt-10">
        <TeachersGrid teachers={teachers} />
      </div>
    </>
  );
}
