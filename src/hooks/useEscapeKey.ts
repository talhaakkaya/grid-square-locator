import { useEffect } from 'react';

/**
 * Hook to handle Escape key press events.
 *
 * @param handler The function to call when Escape is pressed
 * @param enabled Whether the handler is active (default: true)
 */
export function useEscapeKey(
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handler, enabled]);
}
