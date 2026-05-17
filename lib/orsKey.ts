export const DEV_KEY_STORAGE_KEY = "carpool.devOrsKey";

export type ResolveDeps = {
  envKey: string | undefined;
  enableDialog: boolean;
  readLocalStorage: () => string | null;
};

/**
 * Pure resolver — pick the active OpenRouteService API key in priority order:
 *   1. NEXT_PUBLIC_OPENROUTESERVICE_API_KEY (env)
 *   2. localStorage[DEV_KEY_STORAGE_KEY] — only if the dialog flag is enabled
 *   3. null
 */
export function resolveApiKey(deps: ResolveDeps): string | null {
  if (deps.envKey && deps.envKey.length > 0) return deps.envKey;
  if (!deps.enableDialog) return null;
  const local = deps.readLocalStorage();
  return local && local.length > 0 ? local : null;
}

export function getActiveApiKey(): string | null {
  const enableDialog = process.env.NEXT_PUBLIC_ENABLE_API_KEY_DIALOG === "true";
  return resolveApiKey({
    envKey: process.env.NEXT_PUBLIC_OPENROUTESERVICE_API_KEY,
    enableDialog,
    readLocalStorage: () =>
      typeof window === "undefined" ? null : window.localStorage.getItem(DEV_KEY_STORAGE_KEY),
  });
}

export function writeDevApiKey(key: string): void {
  if (typeof window === "undefined") {
    throw new Error("writeDevApiKey is browser-only");
  }
  if (process.env.NEXT_PUBLIC_ENABLE_API_KEY_DIALOG !== "true") {
    throw new Error("Dev API key dialog is disabled in this build.");
  }
  window.localStorage.setItem(DEV_KEY_STORAGE_KEY, key);
}

export function clearDevApiKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEV_KEY_STORAGE_KEY);
}
