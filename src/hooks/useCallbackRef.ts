import { useRef, useEffect } from 'react';

/**
 * Hook that keeps a ref synchronized with a callback value.
 * Prevents stale closure issues in event handlers.
 *
 * @param callback The callback function to keep in sync
 * @returns A ref that always points to the latest callback
 */
export function useCallbackRef<T>(callback: T | undefined): React.RefObject<T | undefined> {
  const ref = useRef<T | undefined>(callback);

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  return ref;
}
