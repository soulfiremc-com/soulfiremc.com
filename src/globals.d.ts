declare module "@fontsource-variable/geist";
declare module "@fontsource-variable/geist-mono";

// oxlint-disable-next-line typescript/consistent-type-definitions -- this merges with the ImportMetaEnv interface from vite/client
interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  readonly VITE_BETTER_AUTH_IDENTIFY_URL?: string;
  readonly VITE_DISCORD_LINK?: string;
  readonly VITE_DONATE_LINK?: string;
  readonly VITE_GITHUB_LINK?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_REVIEW_TURNSTILE_SITE_KEY?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}
