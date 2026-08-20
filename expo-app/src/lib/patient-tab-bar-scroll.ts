const TOP_REVEAL_PX = 24;
const MIN_SCROLL_DELTA = 6;

type VisibilityListener = (visible: boolean) => void;

let lastScrollTop = 0;
let tabBarVisible = true;
const listeners = new Set<VisibilityListener>();

function notify(visible: boolean) {
  if (visible === tabBarVisible) return;
  tabBarVisible = visible;
  listeners.forEach((listener) => listener(visible));
}

/** Inscreve no auto-hide da tab bar (RN Animated — sem Reanimated global). */
export function subscribePatientTabBarVisibility(listener: VisibilityListener): () => void {
  listeners.add(listener);
  listener(tabBarVisible);
  return () => {
    listeners.delete(listener);
  };
}

export function reportPatientTabBarScroll(scrollTop: number) {
  if (scrollTop <= TOP_REVEAL_PX) {
    lastScrollTop = scrollTop;
    notify(true);
    return;
  }

  const delta = scrollTop - lastScrollTop;
  lastScrollTop = scrollTop;

  if (Math.abs(delta) < MIN_SCROLL_DELTA) return;
  notify(delta <= 0);
}

export function resetPatientTabBarScrollReveal() {
  lastScrollTop = 0;
  notify(true);
}
