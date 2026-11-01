/**
 * Helpers so every popup closes when the user clicks outside it.
 */
import type React from 'react';
import { useEffect } from 'react';

// Whether the current mouse/touch press started on a popup backdrop.
let pressStartedOnBackdrop = false;

/**
 * Spread onto a modal's full-screen backdrop element:
 *   <div className="fixed inset-0 ..." {...closeOnBackdrop(onClose)}>
 *
 * Closes only when both the press and the release happen on the backdrop
 * itself, so selecting text in a form and releasing the mouse outside the
 * dialog does not close it by accident.
 */
export function closeOnBackdrop(onClose: () => void) {
  return {
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => {
      pressStartedOnBackdrop = e.target === e.currentTarget;
    },
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      if (e.target === e.currentTarget && pressStartedOnBackdrop) onClose();
      pressStartedOnBackdrop = false;
    },
  };
}

/**
 * Closes a dropdown/menu when the user presses anywhere outside `ref`.
 */
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onOutside: () => void
) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (el && !el.contains(event.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [ref, isOpen, onOutside]);
}
