import { useCallback, useEffect, useState } from "@harborclient/sdk/react";
import type { PluginContext } from "@harborclient/sdk";
import { copyToClipboard } from "@harborclient/sdk/clipboard";
import {
  Button,
  FieldError,
  FormGroup,
  Input,
} from "@harborclient/sdk/components";
import {
  MOCK_BASE_URL_VARIABLE,
  MOCK_BASE_URL_VARIABLE_NAME,
  MOCK_SERVER_VIEW_ID,
} from "../constants";
import {
  getMockError,
  getMockStatus,
  getMockStubs,
  setMockError,
  setMockStatus,
  setMockStubs,
  subscribeMockState,
} from "../state";
import type { MockServerUiStatus } from "../types";

interface Props {
  /**
   * Renderer plugin context for IPC and host commands.
   */
  hc: PluginContext;
}

/**
 * Compact footer panel for starting/stopping the mock server and opening the full page.
 *
 * @param props - Component props.
 */
export function MockServerPanel({ hc }: Props) {
  const [portInput, setPortInput] = useState("0");
  const [status, setStatus] = useState<MockServerUiStatus>(getMockStatus());
  const [stubCount, setStubCount] = useState(getMockStubs().length);
  const [error, setError] = useState<string | null>(getMockError());
  const [busy, setBusy] = useState(false);

  /**
   * Refreshes cached status from the main plugin entry.
   */
  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      const next = await hc.ipc.invoke<MockServerUiStatus>("status");
      await setMockStatus(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMockError(message);
    }
  }, [hc]);

  /**
   * Subscribes to shared state and loads initial status on mount.
   */
  useEffect(() => {
    void refreshStatus();
    return subscribeMockState(() => {
      setStatus(getMockStatus());
      setStubCount(getMockStubs().length);
      setError(getMockError());
    });
  }, [refreshStatus]);

  const baseUrl =
    status.running && status.port !== undefined
      ? `http://localhost:${status.port}`
      : null;

  /**
   * Starts the mock server with the configured port.
   */
  const handleStart = useCallback(async (): Promise<void> => {
    setBusy(true);
    setMockError(null);
    try {
      await setMockStubs(getMockStubs());
      const port = Number(portInput);
      const result = await hc.ipc.invoke<MockServerUiStatus>("start", {
        port: Number.isFinite(port) ? port : 0,
      });
      await setMockStatus(result);
      const url = `http://localhost:${result.port}`;
      await hc.commands.execute(
        "harborclient:setGlobalVariable",
        MOCK_BASE_URL_VARIABLE_NAME,
        url
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMockError(message);
    } finally {
      setBusy(false);
    }
  }, [hc, portInput]);

  /**
   * Stops the mock server without clearing mockBaseUrl.
   */
  const handleStop = useCallback(async (): Promise<void> => {
    setBusy(true);
    setMockError(null);
    try {
      const result = await hc.ipc.invoke<MockServerUiStatus>("stop");
      await setMockStatus(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMockError(message);
    } finally {
      setBusy(false);
    }
  }, [hc]);

  /**
   * Opens the full-page Mock Server main view.
   */
  const handleOpenFullPage = useCallback(async (): Promise<void> => {
    setMockError(null);
    try {
      await hc.commands.execute(
        "harborclient:openMainView",
        hc.pluginId,
        MOCK_SERVER_VIEW_ID
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMockError(message);
    }
  }, [hc]);

  /**
   * Copies the mockBaseUrl template variable to the clipboard.
   */
  const handleCopyMockBaseUrlVariable = useCallback(async (): Promise<void> => {
    try {
      await copyToClipboard(hc, MOCK_BASE_URL_VARIABLE, {
        toast: `Copied ${MOCK_BASE_URL_VARIABLE}`,
      });
    } catch {
      // Clipboard access may be unavailable in some host contexts.
    }
  }, [hc]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-control">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-separator px-3 py-2 pr-8">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-medium text-text">Mock server</h3>
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status.running ? "bg-success" : "bg-muted"
            }`}
            aria-hidden="true"
          />
          <span className="text-[14px] text-muted" role="status">
            {status.running ? `Listening on port ${status.port}` : "Stopped"}
          </span>
        </div>
        <span className="text-[14px] text-muted" role="status">
          {stubCount} stub{stubCount === 1 ? "" : "s"} · {status.hitCount} hit
          {status.hitCount === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleOpenFullPage()}
          >
            Open Mock Server
          </Button>
          {status.running ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleStop()}
            >
              Stop
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => void handleStart()}
            >
              Start
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        <div className="flex flex-col gap-4">
          {error && (
            <FieldError roleAlert spacing="section">
              {error}
            </FieldError>
          )}

          {baseUrl && (
            <p className="text-[14px] text-text" role="status">
              <span>
                Base URL: <span className="font-mono">{baseUrl}</span>
              </span>{" "}
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 font-mono underline-offset-2 hover:underline"
                style={{ color: "#32D2E2" }}
                title="Click to copy"
                onClick={() => void handleCopyMockBaseUrlVariable()}
              >
                {MOCK_BASE_URL_VARIABLE}
              </button>
            </p>
          )}

          <FormGroup
            label="Port"
            htmlFor="mock-port"
            description="Use 0 for the first available non-privileged port. Manage stubs on the full Mock Server page."
          >
            <Input
              id="mock-port"
              type="number"
              min={0}
              max={65535}
              className="max-w-[12rem]"
              value={portInput}
              disabled={status.running || busy}
              onChange={(event) => setPortInput(event.target.value)}
            />
          </FormGroup>
        </div>
      </div>
    </div>
  );
}
