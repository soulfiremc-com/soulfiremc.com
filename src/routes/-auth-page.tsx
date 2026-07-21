import { useParams } from "@tanstack/react-router";
import { Auth } from "@/components/auth/auth";
import { SiteShell } from "@/components/site-shell";

export function AuthPage() {
  const { path } = useParams({ from: "/auth/$path" });

  return (
    <SiteShell>
      <main className="flex min-h-[60vh] items-center justify-center p-4">
        <Auth path={path} />
      </main>
    </SiteShell>
  );
}
