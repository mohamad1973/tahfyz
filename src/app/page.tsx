import { HomePageClient } from "@/components/home-page-client";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getTeachers } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const teachers = await getTeachers();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <HomePageClient teachers={teachers} />
      <SiteFooter />
    </div>
  );
}
