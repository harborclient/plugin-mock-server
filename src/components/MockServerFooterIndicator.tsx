import { useEffect } from "@harborclient/sdk/react";
import { syncOnWindowFocus } from "@harborclient/sdk/store";
import { getMockStatusStore } from "../state";

/**
 * Status dot on the Mock server footer toggle: green when listening, grey when stopped.
 */
export function MockServerFooterIndicator() {
  const status = getMockStatusStore().useValue();

  /**
   * Keeps status in sync with other plugin webviews via focus, visibility, and polling.
   */
  useEffect(() => {
    const syncDisposable = syncOnWindowFocus(getMockStatusStore(), {
      intervalMs: 500,
    });
    return () => {
      syncDisposable.dispose();
    };
  }, []);

  return (
    <span className="inline-flex items-center" role="status">
      <span className="sr-only">
        {status.running ? "Mock server active" : "Mock server stopped"}
      </span>
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          status.running ? "bg-success" : "bg-muted"
        }`}
        aria-hidden="true"
      />
    </span>
  );
}
