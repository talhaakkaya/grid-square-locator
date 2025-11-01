/**
 * Custom hook to detect clicks outside a referenced element
 */

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Hook that triggers a handler when user clicks outside the referenced element
 * @param ref Reference to the element to watch
 * @param handler Callback function to execute on outside click
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void
): void {
  // Store handler in a ref to avoid recreating event listener on every handler change
  const handlerRef = useRef(handler);

  // Update ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handlerRef.current();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref]);
}
