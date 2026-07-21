import { useParams } from "@tanstack/react-router";
import { Settings } from "@/components/auth/settings/settings";
import { SiteShell } from "@/components/site-shell";

export function AccountPage() {
  const { path } = useParams({ from: "/account/$path" });

  return (
    <SiteShell>
      <main className="mx-auto max-w-(--fd-layout-width) p-4 md:p-6">
        <Settings path={path} />
      </main>
    </SiteShell>
  );
}
