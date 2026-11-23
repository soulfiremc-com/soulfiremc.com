import type { User } from "better-auth";
import { useQuery } from "@tanstack/react-query";
import { User2 } from "lucide-react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionQueryOptions } from "@/lib/auth/session-query";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n-react";

type UserMenuComponent = ComponentType<{ withProviders: boolean }>;

/** Whether a Better Auth UI provider wraps the page, as on auth pages. */
const AuthUiProvidersContext = createContext(false);
export const AuthUiProvidersMounted = AuthUiProvidersContext.Provider;

let userMenu: Promise<UserMenuComponent> | undefined;
let loadedUserMenu: UserMenuComponent | undefined;

function loadUserMenu(): Promise<UserMenuComponent> {
  userMenu ??= import("./user-menu").then(
    (module) => (loadedUserMenu = module.UserMenu),
    (error: unknown) => {
      // A failed chunk load may be temporary, so the next intent retries.
      userMenu = undefined;
      throw error;
    },
  );
  return userMenu;
}

function SessionAvatar() {
  // Not Better Auth UI's `useSession`: importing it would load that whole
  // bundle on every page.
  const { data: session, isPending } = useQuery(
    sessionQueryOptions(authClient),
  );
  if (isPending) return <Skeleton className="size-8 rounded-full" />;
  // The username plugin adds these fields, which the shared client type omits.
  const user:
    | (User & { username?: string | null; displayUsername?: string | null })
    | undefined = session?.user;
  const initials = (user?.username || user?.name || user?.email)
    ?.slice(0, 2)
    .toUpperCase();
  return (
    <Avatar>
      <AvatarImage
        src={user?.image ?? undefined}
        alt={user?.displayUsername || user?.name || user?.email}
      />
      <AvatarFallback>
        {initials || <User2 className="size-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * The header user menu. It first renders a light button that shows the
 * session avatar, and loads the full Better Auth UI menu when the visitor
 * points at, focuses, or presses it. Pages then skip that code until someone
 * uses the menu. A press before the menu loads opens it once it is ready.
 */
export function HeaderUserButton() {
  const t = useT();
  const providersMounted = use(AuthUiProvidersContext);
  // A menu loaded on an earlier page shows at once. The first page always
  // hydrates the light button, because the menu loads only after hydration.
  const [menu, setMenu] = useState(() => loadedUserMenu);
  const lightButton = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLSpanElement>(null);
  const handoff = useRef({ focus: false, open: false });

  const activate = useCallback(() => {
    loadUserMenu()
      .then((component) => {
        handoff.current.focus ||=
          !!lightButton.current &&
          document.activeElement === lightButton.current;
        setMenu(() => component);
      })
      // The light button stays, and the next intent retries the load.
      .catch(() => undefined);
  }, []);

  // Auth pages already load Better Auth UI, so they show the full menu at once.
  useEffect(() => {
    if (providersMounted) activate();
  }, [providersMounted, activate]);

  // Move focus and a pending press from the light button to the full menu.
  useEffect(() => {
    const trigger = menu && container.current?.querySelector("button");
    if (!trigger) return;
    const { focus, open } = handoff.current;
    handoff.current = { focus: false, open: false };
    if (focus || open) trigger.focus();
    if (open) trigger.click();
  }, [menu]);

  const UserMenu = menu;
  return (
    <span ref={container} className="contents">
      {UserMenu ? (
        <UserMenu withProviders={!providersMounted} />
      ) : (
        <button
          ref={lightButton}
          type="button"
          aria-label={t("authUi.auth.account")}
          aria-haspopup="menu"
          className="rounded-full"
          onPointerEnter={activate}
          onFocus={activate}
          onClick={() => {
            handoff.current.open = true;
            activate();
          }}
        >
          <SessionAvatar />
        </button>
      )}
    </span>
  );
}
