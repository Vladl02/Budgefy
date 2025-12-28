import { router, type Href } from "expo-router";
import { useCallback, useRef } from "react";
import { InteractionManager } from "react-native";

export function useGuardedModalPush() {
  const lockedRef = useRef(false);

  const pushModal = useCallback((href: Href) => {
    if (lockedRef.current) return; // ignore double tap while transitioning

    lockedRef.current = true;
    router.push(href);

    // Unlock after all interactions/animations complete
    InteractionManager.runAfterInteractions(() => {
      lockedRef.current = false;
    });
  }, []);

  return { pushModal };
}
