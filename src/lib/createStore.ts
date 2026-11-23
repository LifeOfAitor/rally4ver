import { useSyncExternalStore } from 'react';

/** Minimal observable store shared by the background task and the UI. */
export function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();

  const store = {
    get: () => state,
    set(patch: Partial<T>) {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    use<S>(selector: (state: T) => S): S {
      return useSyncExternalStore(store.subscribe, () => selector(state));
    },
  };
  return store;
}
