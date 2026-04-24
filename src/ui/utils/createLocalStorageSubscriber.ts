interface LocalStorageSubscriberOptions {
  /**
   * Custom same-tab event name. `localStorage` cross-tab updates fire a
   * native `storage` event, but same-tab writes don't — we need a
   * parallel channel so every hook instance in the same tab re-reads.
   */
  sameTabEventName: string;
  /**
   * When set, cross-tab `storage` events only invoke `onChange` if they
   * target this key. Defaults to `undefined` (fire on any storage event)
   * because some callers — e.g. cookie-mirrored session state — want to
   * react to any storage change that might invalidate their snapshot.
   */
  storageKey?: string;
}

export interface LocalStorageSubscriber {
  /** `useSyncExternalStore`-compatible subscribe function. */
  subscribe: (onChange: () => void) => () => void;
  /**
   * Dispatch the same-tab event. Call this after a local `setItem` /
   * `removeItem` so every subscribed hook instance re-reads.
   */
  publishChange: () => void;
}

/**
 * Build a `useSyncExternalStore` subscribe pair for a localStorage-backed
 * value. Handles SSR (no `window`), cross-tab notifications via the
 * native `storage` event, and same-tab notifications via a caller-named
 * `CustomEvent`.
 *
 * ```ts
 * const { subscribe, publishChange } = createLocalStorageSubscriber({
 *   sameTabEventName: 'housevote:pricebasis:change',
 *   storageKey: 'housevote.priceBasis',
 * });
 * ```
 */
export function createLocalStorageSubscriber(
  options: LocalStorageSubscriberOptions,
): LocalStorageSubscriber {
  function subscribe(onChange: () => void) {
    if (typeof window === 'undefined') {
      return () => {};
    }

    function handleStorage(event: StorageEvent) {
      if (!options.storageKey || event.key === options.storageKey) {
        onChange();
      }
    }

    window.addEventListener('storage', handleStorage);
    window.addEventListener(options.sameTabEventName, onChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(options.sameTabEventName, onChange);
    };
  }

  function publishChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(options.sameTabEventName));
    }
  }

  return { subscribe, publishChange };
}
