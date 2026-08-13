"use client";

import { OpenStudentChatButton } from "@/components/open-chat-button";
import { useI18n } from "@/lib/i18n/provider";
import type { User } from "@/lib/types";

export function TeacherChatSection({ students }: { students: User[] }) {
  const { t } = useI18n();
  return (
    <section className="mt-8 rounded-2xl border-2 border-olive/40 bg-card p-5">
      <h2 className="font-display text-xl text-olive-deep">{t.lessonChat}</h2>
      <p className="mt-1 text-sm text-ink-muted">{t.lessonChatHelpTeacher}</p>
      <ul className="mt-3 space-y-2">
        {students.length === 0 && (
          <li className="text-sm text-ink-muted">{t.chatUnlock}</li>
        )}
        {students.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-bg px-4 py-3 text-sm"
          >
            <span>
              <span className="font-medium">{s.name}</span>
              <span className="mx-2 text-ink-muted">·</span>
              <span className="font-mono text-xs">{s.username}</span>
            </span>
            <OpenStudentChatButton studentId={s.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
