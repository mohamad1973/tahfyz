import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TeachersPageClient } from "@/components/teachers-page-client";
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
        <TeachersPageClient teachers={teachers} />
      </main>
      <SiteFooter />
    </div>
  );
}
