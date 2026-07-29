import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TeachersGrid } from "@/components/teacher-card";
import { getTeachers } from "@/lib/store";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teachers",
};

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const teachers = await getTeachers();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-4xl text-olive-deep sm:text-5xl">
          Our teachers
        </h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Click a teacher card to open their profile — about, videos, audio, and
          book a lesson.
        </p>
        <div className="mt-10">
          <TeachersGrid teachers={teachers} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
