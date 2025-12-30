import { router, type Href } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

const UNLOCK_DELAY_MS = 350;

export function useGuardedModalPush() {
  const lockedRef = useRef(false);
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
      }
    };
  }, []);

  const pushModal = useCallback((href: Href) => {
    if (lockedRef.current) return; // ignore double tap while transitioning

    lockedRef.current = true;
    router.push(href);

    if (unlockTimeoutRef.current) {
      clearTimeout(unlockTimeoutRef.current);
    }

    // Unlock after a short delay to avoid double taps.
    unlockTimeoutRef.current = setTimeout(() => {
      lockedRef.current = false;
      unlockTimeoutRef.current = null;
    }, UNLOCK_DELAY_MS);
  }, []);

  return { pushModal };
}
