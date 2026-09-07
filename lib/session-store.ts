import { STORAGE_KEY } from "@/lib/session";

/**
 * localStorage as a React external store, so the saved closing can be read
 * during render (via useSyncExternalStore) instead of being copied into state
 * by an effect.
 *
 * The snapshot is the raw JSON string: a stable primitive, so React can
 * compare it cheaply and only re-render when it genuinely changes.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Safari private mode (and a full quota) throw on write. Falling back to
 * memory means the closing still works for the rest of the session — it just
 * won't survive a refresh, which beats silently dropping every entry.
 */
let memory: string | null = null;
let usingMemory = false;

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // Another tab writing the same closing should show up here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  globalThis.addEventListener?.("storage", onStorage);
  return () => {
    listeners.delete(listener);
    globalThis.removeEventListener?.("storage", onStorage);
  };
}

export function getSnapshot(): string | null {
  if (usingMemory) return memory;
  try {
    return storage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    usingMemory = true;
    return memory;
  }
}

/** Nothing is stored on the server, so the first render matches the client's. */
export function getServerSnapshot(): string | null {
  return null;
}

export function write(value: string | null): void {
  memory = value;
  try {
    const store = storage();
    if (!store) {
      usingMemory = true;
    } else if (value === null) {
      store.removeItem(STORAGE_KEY);
    } else {
      store.setItem(STORAGE_KEY, value);
    }
  } catch {
    usingMemory = true;
  }
  for (const listener of listeners) listener();
}

/** Test seam: forget the memory fallback between tests. */
export function resetStoreForTests(): void {
  memory = null;
  usingMemory = false;
  listeners.clear();
}
