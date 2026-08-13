"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import {
  openChatWithStudentAction,
  openChatWithTeacherAction,
} from "@/lib/actions";

export function OpenTeacherChatButton({
  teacherId,
  label,
}: {
  teacherId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await openChatWithTeacherAction(teacherId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.push(`/chat/${res.threadId}`);
          });
        }}
        className="rounded-lg bg-olive px-3 py-1.5 text-xs font-semibold text-card disabled:opacity-60"
      >
        {label || "Open lesson chat"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

export function OpenStudentChatButton({
  studentId,
  label,
}: {
  studentId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await openChatWithStudentAction(studentId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.push(`/chat/${res.threadId}`);
          });
        }}
        className="rounded-lg bg-olive px-3 py-1.5 text-xs font-semibold text-card disabled:opacity-60"
      >
        {label || "شات مع الطالب"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
