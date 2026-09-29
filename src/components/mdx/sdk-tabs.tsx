"use client";

import {
  Tab,
  Tabs as FumadocsTabs,
  type TabsProps,
} from "fumadocs-ui/components/tabs";
import { useCallback, useSyncExternalStore, type ComponentType } from "react";

const storagePrefix = "soulfire-sdk-tabs:";
const listeners = new Map<string, Set<() => void>>();
const selections = new Map<string, string>();

type ControlledTabsProps = TabsProps & {
  items: string[];
  value: string;
  onValueChange: (value: string) => void;
};

const ControlledTabs = FumadocsTabs as ComponentType<ControlledTabsProps>;

function tabValue(label: string) {
  return label.toLowerCase().replace(/\s/u, "-");
}

function readSelection(key: string) {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key) ?? selections.get(key) ?? null;
  } catch {
    return selections.get(key) ?? null;
  }
}

function saveSelection(key: string, value: string) {
  selections.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the selection for this page when storage is unavailable.
  }

  for (const listener of listeners.get(key) ?? []) listener();
}

function subscribe(key: string, listener: () => void) {
  const group = listeners.get(key) ?? new Set<() => void>();
  group.add(listener);
  listeners.set(key, group);

  const onStorage = (event: StorageEvent) => {
    if (event.key === key) {
      if (event.newValue === null) selections.delete(key);
      else selections.set(key, event.newValue);
      listener();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    group.delete(listener);
    if (group.size === 0) listeners.delete(key);
    window.removeEventListener("storage", onStorage);
  };
}

export function Tabs({
  items,
  groupId = items.join("|"),
  defaultIndex = 0,
  ...props
}: Omit<TabsProps, "items"> & { items: string[]; groupId?: string }) {
  const key = `${storagePrefix}${groupId}`;
  const subscribeToSelection = useCallback(
    (listener: () => void) => subscribe(key, listener),
    [key],
  );
  const getSelection = useCallback(() => readSelection(key), [key]);
  const selected = useSyncExternalStore(
    subscribeToSelection,
    getSelection,
    () => null,
  );
  const fallback = tabValue(items[defaultIndex] ?? items[0] ?? "");
  const value = items.some((item) => tabValue(item) === selected)
    ? selected!
    : fallback;

  return (
    <ControlledTabs
      {...props}
      items={items}
      value={value}
      onValueChange={(nextValue) => saveSelection(key, nextValue)}
    />
  );
}

export { Tab };
