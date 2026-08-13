import { getSession, dashboardPath } from "@/lib/auth";
import {
  SiteFooterClient,
  SiteHeaderClient,
} from "@/components/site-chrome-client";

export async function SiteHeader() {
  const session = await getSession();
  return (
    <SiteHeaderClient
      signedIn={Boolean(session)}
      dashboardHref={session ? dashboardPath(session.role) : undefined}
    />
  );
}

export function SiteFooter() {
  return <SiteFooterClient />;
}
