import { installReact } from "@harborclient/sdk";
import type { PluginContext } from "@harborclient/sdk";
import { MockServerPanel } from "./components/MockServerPanel";
import { MockServerView } from "./components/MockServerView";
import { MOCK_SERVER_PANEL_ID, MOCK_SERVER_VIEW_ID } from "./constants";
import { disposeMockState, getMockStatusStore, initMockState } from "./state";

/**
 * Pushes the native footer status-dot state for the current mock server status.
 *
 * @param hc - Renderer plugin context from the HarborClient host.
 */
function pushFooterIndicator(hc: PluginContext): void {
  const status = getMockStatusStore().getSnapshot();
  hc.ui.setFooterPanelIndicator(MOCK_SERVER_PANEL_ID, {
    status: status.running ? "success" : "muted",
    label: status.running ? "Mock server active" : "Mock server stopped",
  });
}

/**
 * Activates the renderer half and registers mock server UI contributions.
 *
 * @param hc - Renderer plugin context from the HarborClient host.
 */
export function activate(hc: PluginContext): void {
  installReact(hc.react);
  initMockState(hc);

  hc.subscriptions.push({ dispose: disposeMockState });

  /**
   * Footer panel host that closes over the plugin context.
   */
  function MockServerPanelHost() {
    return <MockServerPanel hc={hc} />;
  }

  /**
   * Full-page main view host that closes over the plugin context.
   */
  function MockServerViewHost() {
    return <MockServerView hc={hc} />;
  }

  hc.subscriptions.push(
    hc.ui.registerFooterPanel({
      id: MOCK_SERVER_PANEL_ID,
      title: "Mock server",
      Component: MockServerPanelHost,
    })
  );

  pushFooterIndicator(hc);
  const unsubscribeIndicator = getMockStatusStore().subscribe(() => {
    pushFooterIndicator(hc);
  });
  hc.subscriptions.push({ dispose: unsubscribeIndicator });
  hc.subscriptions.push({
    dispose: () => {
      hc.ui.setFooterPanelIndicator(MOCK_SERVER_PANEL_ID, null);
    },
  });

  hc.subscriptions.push(
    hc.ui.registerMainView({
      id: MOCK_SERVER_VIEW_ID,
      title: "Mock Server",
      icon: "server",
      Component: MockServerViewHost,
    } as Parameters<PluginContext["ui"]["registerMainView"]>[0])
  );
}
