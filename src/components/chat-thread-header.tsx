"use client";

import Link from "next/link";
import { LessonLiveCall } from "@/components/lesson-live-call";
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-olive-deep">{t.lessonChat}</h1>
          <p className="mt-0.5 text-xs text-ink-muted">{t.micHintBoth}</p>
        </div>
        <Link href={backHref} className="shrink-0 text-sm underline">
          {t.back}
        </Link>
      </div>
      <LessonLiveCall
        threadId={threadId}
        currentUserId={currentUserId}
        role={role}
      />
      <LessonChatClient
        threadId={threadId}
        currentUserId={currentUserId}
        role={role}
        peerName={peerName}
      />
    </>
  );
}
