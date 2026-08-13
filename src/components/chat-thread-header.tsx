"use client";

import Link from "next/link";
import { LessonChatClient } from "@/components/lesson-chat-client";
import { useI18n } from "@/lib/i18n/provider";

export function ChatThreadHeader({
  backHref,
  peerName,
  threadId,
  currentUserId,
  role,
}: {
  backHref: string;
  peerName: string;
  threadId: string;
  currentUserId: string;
  role: "student" | "teacher";
}) {
  const { t } = useI18n();
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-olive-deep">{t.lessonChat}</h1>
        <Link href={backHref} className="text-sm underline">
          {t.back}
        </Link>
      </div>
      <LessonChatClient
        threadId={threadId}
        currentUserId={currentUserId}
        role={role}
        peerName={peerName}
      />
    </>
  );
}
