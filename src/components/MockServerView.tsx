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
} from "@harborclient/sdk/components";
import { MOCK_BASE_URL_VARIABLE } from "../constants";
import {
  getMockError,
  getMockStatus,
  getMockStubs,
  setMockError,
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

/**
 * Full-page main view for managing mock stubs and reviewing server status.
 *
 * @param props - Component props.
 */
export function MockServerView({ hc }: Props) {
  const [status, setStatus] = useState<MockServerUiStatus>(getMockStatus());
  const [stubs, setStubs] = useState<MockStub[]>(getMockStubs());
  const [selectedId, setSelectedId] = useState<string | null>(
    getMockStubs()[0]?.id ?? null
  );
  const [error, setError] = useState<string | null>(getMockError());

  /**
   * Subscribes to shared mock state so the view stays in sync with the footer.
   */
  useEffect(() => {
    return subscribeMockState(() => {
      setStatus(getMockStatus());
      setStubs(getMockStubs());
      setError(getMockError());
    });
  }, []);

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
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
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
          {baseUrl && (
            <p className="ml-auto text-[14px] text-text" role="status">
              <span className="font-mono">{baseUrl}</span>{" "}
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
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto flex h-full min-h-0 max-w-[80rem] flex-col gap-5">
            {error && (
              <FieldError roleAlert spacing="section">
                {error}
              </FieldError>
            )}

            {stubs.length === 0 ? (
              <div className="flex flex-col gap-3 rounded border border-separator bg-panel p-6">
                <p className="text-text">
                  Add a stub to return canned responses from the mock server.
                  Start and stop the server from the footer panel.
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
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,20rem)_1fr]">
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
