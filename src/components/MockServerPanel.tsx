import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "@harborclient/sdk/react";
import type { PluginContext } from "@harborclient/sdk";
import { copyToClipboard } from "@harborclient/sdk/clipboard";
import {
  Button,
  CodeEditorConfigProvider,
  DEFAULT_CODE_EDITOR_CONFIG,
  FieldError,
  FormGroup,
  Input,
} from "@harborclient/sdk/components";
import {
  getMockError,
  getMockStatus,
  getMockStubs,
  setMockError,
  setMockStatus,
  setMockStubs,
  subscribeMockState,
} from "../state";
import {
  createDefaultStub,
  STUB_TEMPLATES,
  type MockServerUiStatus,
  type MockStub,
} from "../types";
import { StubEditor } from "./StubEditor";
import { StubList } from "./StubList";

interface Props {
  /**
   * Renderer plugin context for IPC and host commands.
   */
  hc: PluginContext;
}

const MOCK_BASE_URL_VARIABLE = "{{mockBaseUrl}}";

/**
 * Slide-up footer panel for configuring stubs and controlling the mock server.
 *
 * @param props - Component props.
 */
export function MockServerPanel({ hc }: Props) {
  const [portInput, setPortInput] = useState("0");
  const [status, setStatus] = useState<MockServerUiStatus>(getMockStatus());
  const [stubs, setStubs] = useState<MockStub[]>(getMockStubs());
  const [selectedId, setSelectedId] = useState<string | null>(
    getMockStubs()[0]?.id ?? null
  );
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
      setStubs(getMockStubs());
      setError(getMockError());
    });
  }, [refreshStatus]);

  /**
   * Keeps selection valid when the stub list changes.
   */
  useEffect(() => {
    if (stubs.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !stubs.some((stub) => stub.id === selectedId)) {
      setSelectedId(stubs[0]?.id ?? null);
    }
  }, [stubs, selectedId]);

  const selectedStub = useMemo(
    () => stubs.find((stub) => stub.id === selectedId) ?? null,
    [stubs, selectedId]
  );

  const baseUrl =
    status.running && status.port !== undefined
      ? `http://localhost:${status.port}`
      : null;

  /**
   * Persists a new stub list to storage and the main process.
   *
   * @param next - Stubs in display order.
   */
  const handleStubsChange = useCallback(
    async (next: MockStub[]): Promise<void> => {
      setMockError(null);
      await setMockStubs(next);
    },
    []
  );

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
        "mockBaseUrl",
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
   * Adds a default stub and selects it.
   */
  const handleAddStub = useCallback((): void => {
    const stub = createDefaultStub({ path: `/example-${stubs.length + 1}` });
    void handleStubsChange([...stubs, stub]);
    setSelectedId(stub.id);
  }, [handleStubsChange, stubs]);

  /**
   * Adds a stub from a quick template.
   *
   * @param partial - Template field overrides.
   */
  const handleAddTemplate = useCallback(
    (partial: Partial<MockStub>): void => {
      const stub = createDefaultStub(partial);
      void handleStubsChange([...stubs, stub]);
      setSelectedId(stub.id);
    },
    [handleStubsChange, stubs]
  );

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

  /**
   * Patches the selected stub and persists.
   *
   * @param patch - Fields to merge.
   */
  const handleSelectedPatch = useCallback(
    (patch: Partial<MockStub>): void => {
      if (!selectedStub) {
        return;
      }
      void handleStubsChange(
        stubs.map((stub) =>
          stub.id === selectedStub.id ? { ...stub, ...patch } : stub
        )
      );
    },
    [handleStubsChange, selectedStub, stubs]
  );

  return (
    <CodeEditorConfigProvider value={DEFAULT_CODE_EDITOR_CONFIG}>
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
            {stubs.length} stub{stubs.length === 1 ? "" : "s"} ·{" "}
            {status.hitCount} hit
            {status.hitCount === 1 ? "" : "s"}
          </span>
          <div className="ml-auto flex items-center gap-2">
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
              description="Use 0 for the first available non-privileged port."
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

            {stubs.length === 0 ? (
              <div className="flex flex-col gap-3 rounded border border-separator bg-panel p-4">
                <p className="text-[14px] text-text">
                  Add a stub to return canned responses from the mock server.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddStub}
                  >
                    Add stub
                  </Button>
                  {STUB_TEMPLATES.map((template) => (
                    <Button
                      key={template.label}
                      type="button"
                      variant="secondary"
                      onClick={() => handleAddTemplate(template.stub)}
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid min-h-[18rem] grid-cols-1 gap-4 lg:grid-cols-2">
                <StubList
                  stubs={stubs}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onChange={(next) => void handleStubsChange(next)}
                  onAdd={handleAddStub}
                />
                {selectedStub ? (
                  <StubEditor
                    stub={selectedStub}
                    onChange={handleSelectedPatch}
                  />
                ) : (
                  <p className="text-[14px] text-muted">
                    Select a stub to edit.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </CodeEditorConfigProvider>
  );
}
