import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChatThread, getTeacher, getUserById } from "@/lib/store";

type UploadKind = "photo" | "video" | "audio" | "chat-audio";

const CONTENT_TYPES: Record<UploadKind, string[]> = {
  photo: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/webm"],
  audio: [
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/x-m4a",
    "audio/x-wav",
    "audio/wave",
    "audio/webm",
  ],
  "chat-audio": [
    "audio/webm",
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/ogg;codecs=opus",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/x-m4a",
  ],
};

const MAX_BYTES: Record<UploadKind, number> = {
  photo: 2 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  "chat-audio": 8 * 1024 * 1024,
};

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await getSession();
        if (!session) throw new Error("Not authenticated");

        const user = await getUserById(session.userId);
        if (!user) throw new Error("Not authenticated");

        let kind: UploadKind = "photo";
        let title = "Untitled";
        let requestedTeacherId: string | undefined;
        let threadId: string | undefined;
        if (clientPayload) {
          try {
            const parsed = JSON.parse(clientPayload) as {
              kind?: string;
              title?: string;
              teacherId?: string;
              threadId?: string;
            };
            if (
              parsed.kind === "photo" ||
              parsed.kind === "video" ||
              parsed.kind === "audio" ||
              parsed.kind === "chat-audio"
            ) {
              kind = parsed.kind;
            }
            if (parsed.title?.trim()) title = parsed.title.trim();
            if (parsed.teacherId) requestedTeacherId = parsed.teacherId;
            if (parsed.threadId) threadId = parsed.threadId;
          } catch {
            throw new Error("Invalid upload payload");
          }
        }

        if (kind === "chat-audio") {
          if (!threadId) throw new Error("threadId required");
          const thread = await getChatThread(threadId);
          if (!thread) throw new Error("Chat not found");
          const allowed =
            (user.role === "student" && thread.studentId === user.id) ||
            (user.role === "teacher" && thread.teacherId === user.teacherId);
          if (!allowed) throw new Error("Not authorized");
          const prefix = `chat/${threadId}/`;
          if (!pathname.startsWith(prefix)) {
            throw new Error("Invalid upload path");
          }
          return {
            // Omit strict list issues with codec suffixes; allow common audio types
            allowedContentTypes: [
              "audio/webm",
              "audio/webm;codecs=opus",
              "audio/mp4",
              "audio/mpeg",
              "audio/ogg",
              "audio/ogg;codecs=opus",
              "audio/wav",
              "audio/x-wav",
              "audio/wave",
              "audio/x-m4a",
            ],
            maximumSizeInBytes: MAX_BYTES["chat-audio"],
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ threadId, kind, userId: user.id }),
          };
        }

        let teacherId: string;
        if (user.role === "admin") {
          teacherId = requestedTeacherId || "";
          if (!teacherId || !(await getTeacher(teacherId))) {
            throw new Error("Teacher not found");
          }
        } else if (user.role === "teacher" && user.teacherId) {
          teacherId = user.teacherId;
          if (requestedTeacherId && requestedTeacherId !== teacherId) {
            throw new Error("Not authorized");
          }
        } else {
          throw new Error("Not authorized");
        }

        const prefix = `teachers/${teacherId}/`;
        if (!pathname.startsWith(prefix)) {
          throw new Error("Invalid upload path");
        }
        if (!pathname.includes(`/${kind}-`)) {
          throw new Error("Path does not match media kind");
        }

        return {
          allowedContentTypes: CONTENT_TYPES[kind],
          maximumSizeInBytes: MAX_BYTES[kind],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ teacherId, kind, title }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
