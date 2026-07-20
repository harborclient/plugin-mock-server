import type { PluginContext } from "@harborclient/sdk";
import {
  createExternalStore,
  createStorageStore,
  type StorageStore,
} from "@harborclient/sdk/store";
import type { MockServerUiStatus, MockStub } from "./types";

/** Storage key for mock server status shared across plugin webviews. */
export const MOCK_STATUS_STORAGE_KEY = "mock-server-status";

/** Storage key for persisted stubs. */
export const MOCK_STUBS_STORAGE_KEY = "mock-server-stubs";

type Listener = () => void;

let pluginContext: PluginContext | null = null;
let statusStore: StorageStore<MockServerUiStatus> | null = null;
let stubsStore: StorageStore<MockStub[]> | null = null;
const errorStore = createExternalStore<string | null>(null);

/**
 * Parses a raw storage value into mock server UI status.
 *
 * @param raw - Raw value from plugin storage.
 */
function parseMockStatus(raw: unknown): MockServerUiStatus {
  if (!raw || typeof raw !== "object") {
    return { running: false, hitCount: 0, stubCount: 0 };
  }
  const candidate = raw as MockServerUiStatus;
  if (typeof candidate.running !== "boolean") {
    return { running: false, hitCount: 0, stubCount: 0 };
  }
  return {
    running: candidate.running,
    hitCount: typeof candidate.hitCount === "number" ? candidate.hitCount : 0,
    stubCount:
      typeof candidate.stubCount === "number" ? candidate.stubCount : 0,
    ...(typeof candidate.port === "number" ? { port: candidate.port } : {}),
  };
}

/**
 * Parses persisted stubs from storage.
 *
 * @param raw - Raw storage value.
 */
function parseStubs(raw: unknown): MockStub[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is MockStub => {
    return Boolean(
      item &&
        typeof item === "object" &&
        typeof (item as MockStub).id === "string"
    );
  });
}

/**
 * Returns the initialized status store or throws when state is unavailable.
 */
function requireStatusStore(): StorageStore<MockServerUiStatus> {
  if (!statusStore) {
    throw new Error("Mock server state is not initialized.");
  }
  return statusStore;
}

/**
 * Returns the initialized stubs store or throws when state is unavailable.
 */
function requireStubsStore(): StorageStore<MockStub[]> {
  if (!stubsStore) {
    throw new Error("Mock server state is not initialized.");
  }
  return stubsStore;
}

/**
 * Returns the initialized plugin context or throws when state is unavailable.
 */
function requirePluginContext(): PluginContext {
  if (!pluginContext) {
    throw new Error("Mock server state is not initialized.");
  }
  return pluginContext;
}

/**
 * Initializes cross-webview mock state with the plugin context for this webview.
 *
 * @param hc - Renderer plugin context from the HarborClient host.
 */
export function initMockState(hc: PluginContext): void {
  pluginContext = hc;
  statusStore = createStorageStore({
    storage: hc.storage,
    key: MOCK_STATUS_STORAGE_KEY,
    parse: parseMockStatus,
    keepCurrentWhenMissing: true,
  });
  stubsStore = createStorageStore({
    storage: hc.storage,
    key: MOCK_STUBS_STORAGE_KEY,
    parse: parseStubs,
    keepCurrentWhenMissing: true,
  });
  void statusStore.reloadFromStorage();
  void stubsStore.reloadFromStorage().then(async () => {
    const local = stubsStore?.getSnapshot() ?? [];
    try {
      await hc.ipc.invoke<MockStub[]>("setStubs", { stubs: local });
    } catch {
      // Main entry may be inactive briefly during plugin reload.
    }
  });
  void refreshMockStatusFromMain();
}

/**
 * Returns the storage-backed status store after {@link initMockState}.
 */
export function getMockStatusStore(): StorageStore<MockServerUiStatus> {
  return requireStatusStore();
}

/**
 * Returns the storage-backed stubs store after {@link initMockState}.
 */
export function getMockStubsStore(): StorageStore<MockStub[]> {
  return requireStubsStore();
}

/**
 * Clears module-level mock state on plugin deactivation.
 */
export function disposeMockState(): void {
  pluginContext = null;
  statusStore = null;
  stubsStore = null;
  errorStore.setState(null);
}

/**
 * Returns the latest mock server status cached in this webview.
 */
export function getMockStatus(): MockServerUiStatus {
  return (
    statusStore?.getSnapshot() ?? { running: false, hitCount: 0, stubCount: 0 }
  );
}

/**
 * Returns cached stubs for this webview.
 */
export function getMockStubs(): MockStub[] {
  return stubsStore?.getSnapshot() ?? [];
}

/**
 * Returns the latest inline error message for the footer panel.
 */
export function getMockError(): string | null {
  return errorStore.getSnapshot();
}

/**
 * Subscribes to mock server UI state changes in the current webview.
 *
 * @param listener - Called when status, stubs, or error state changes.
 * @returns Unsubscribe function.
 */
export function subscribeMockState(listener: Listener): () => void {
  const unsubscribeStatus =
    statusStore?.subscribe(listener) ?? (() => undefined);
  const unsubscribeStubs = stubsStore?.subscribe(listener) ?? (() => undefined);
  const unsubscribeError = errorStore.subscribe(listener);
  return () => {
    unsubscribeStatus();
    unsubscribeStubs();
    unsubscribeError();
  };
}

/**
 * Refreshes mock server status from the main plugin entry and persists it.
 */
export async function refreshMockStatusFromMain(): Promise<void> {
  const hc = requirePluginContext();
  requireStatusStore();
  try {
    const next = await hc.ipc.invoke<MockServerUiStatus>("status");
    await setMockStatus(next);
  } catch {
    // Main entry may be inactive briefly during plugin reload.
  }
}

/**
 * Updates cached mock server status, persists it, and notifies local subscribers.
 *
 * @param next - New running state and counters.
 */
export async function setMockStatus(next: MockServerUiStatus): Promise<void> {
  await requireStatusStore().set(next);
}

/**
 * Persists stubs locally and syncs them to the main process registry.
 *
 * @param next - Stubs in display order.
 */
export async function setMockStubs(next: MockStub[]): Promise<void> {
  const hc = requirePluginContext();
  const withPriority = next.map((stub, index) => ({
    ...stub,
    priority: index,
  }));
  await requireStubsStore().set(withPriority);
  try {
    await hc.ipc.invoke<MockStub[]>("setStubs", { stubs: withPriority });
    const status = await hc.ipc.invoke<MockServerUiStatus>("status");
    await setMockStatus({ ...status, stubCount: withPriority.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setMockError(message);
  }
}

/**
 * Sets or clears the inline error shown in the footer panel.
 *
 * @param message - Error text, or null to clear.
 */
export function setMockError(message: string | null): void {
  errorStore.setState(message);
}
