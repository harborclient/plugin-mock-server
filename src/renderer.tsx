import { installReact } from "@harborclient/sdk";
import type { PluginContext } from "@harborclient/sdk";
import { MockServerFooterIndicator } from "./components/MockServerFooterIndicator";
import { MockServerPanel } from "./components/MockServerPanel";
import { disposeMockState, initMockState } from "./state";

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

  hc.subscriptions.push(
    hc.ui.registerFooterPanel({
      id: "mock-server.panel",
      title: "Mock server",
      Component: MockServerPanelHost,
      Indicator: MockServerFooterIndicator,
    })
  );
}
