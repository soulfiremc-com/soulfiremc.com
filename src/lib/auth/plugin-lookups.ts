import { deleteUserPlugin as coreDeleteUserPlugin } from "@better-auth-ui/core/plugins/delete-user";
import { passkeyPlugin as corePasskeyPlugin } from "@better-auth-ui/core/plugins/passkey";
import { themePlugin as coreThemePlugin } from "@better-auth-ui/core/plugins/theme";
import { usernamePlugin as coreUsernamePlugin } from "@better-auth-ui/core/plugins/username";

import type { AuthPlugin } from "./auth-plugin";

type AuthPluginFactory<T extends AuthPlugin = AuthPlugin> = {
  id: string;
  (...args: unknown[]): T;
};

function pluginLookup<T extends AuthPlugin>(id: string) {
  return { id } as AuthPluginFactory<T>;
}

export type UseThemeHook = () => {
  theme?: string;
  setTheme: (theme: string) => void;
  themes?: string[];
};

type DeleteUserLookupPlugin = AuthPlugin &
  ReturnType<typeof coreDeleteUserPlugin>;

type PasskeyLookupPlugin = AuthPlugin & ReturnType<typeof corePasskeyPlugin>;

type ThemeLookupPlugin = AuthPlugin &
  ReturnType<typeof coreThemePlugin> & {
    useTheme: UseThemeHook;
  };

type UsernameLookupPlugin = AuthPlugin & ReturnType<typeof coreUsernamePlugin>;

export const deleteUserPluginLookup = pluginLookup<DeleteUserLookupPlugin>(
  coreDeleteUserPlugin.id,
);

export const passkeyPluginLookup = pluginLookup<PasskeyLookupPlugin>(
  corePasskeyPlugin.id,
);

export const themePluginLookup = pluginLookup<ThemeLookupPlugin>(
  coreThemePlugin.id,
);

export const usernamePluginLookup = pluginLookup<UsernameLookupPlugin>(
  coreUsernamePlugin.id,
);
