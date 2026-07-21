import {
  Button,
  CodeEditor,
  FormGroup,
  Input,
} from "@harborclient/sdk/components";
import type { MockStub, MockStubHeader } from "../types";

interface Props {
  /**
   * Stub being edited.
   */
  stub: MockStub;

  /**
   * Called when respond fields change.
   *
   * @param patch - Partial stub updates.
   */
  onChange: (patch: Partial<MockStub>) => void;
}

/**
 * Updates one header row by index.
 *
 * @param headers - Current header rows.
 * @param index - Row index.
 * @param patch - Fields to merge.
 */
function patchHeader(
  headers: MockStubHeader[],
  index: number,
  patch: Partial<MockStubHeader>
): MockStubHeader[] {
  return headers.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

/**
 * Respond section: status, headers, body, and delay.
 *
 * @param props - Component props.
 */
export function RespondFields({ stub, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <FormGroup label="Status" htmlFor="mock-stub-status">
          <Input
            id="mock-stub-status"
            type="number"
            min={100}
            max={599}
            className="max-w-[8rem]"
            value={String(stub.status)}
            aria-label="Response status code"
            onChange={(event) => {
              const status = Number(event.target.value);
              onChange({
                status: Number.isFinite(status)
                  ? Math.trunc(status)
                  : stub.status,
              });
            }}
          />
        </FormGroup>
        <FormGroup label="Delay (ms)" htmlFor="mock-stub-delay">
          <Input
            id="mock-stub-delay"
            type="number"
            min={0}
            max={60000}
            className="max-w-[8rem]"
            value={String(stub.delayMs)}
            aria-label="Response delay in milliseconds"
            onChange={(event) => {
              const delayMs = Number(event.target.value);
              onChange({
                delayMs:
                  Number.isFinite(delayMs) && delayMs > 0
                    ? Math.trunc(delayMs)
                    : 0,
              });
            }}
          />
        </FormGroup>
      </div>
      <p className="m-0 text-[14px] text-muted">
        Host waits before writing the response.
      </p>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-medium text-text">Headers</span>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              onChange({
                headers: [
                  ...stub.headers,
                  { key: "", value: "", enabled: true },
                ],
              })
            }
          >
            Add header
          </Button>
        </div>
        {stub.headers.length === 0 ? (
          <p className="text-[14px] text-muted">No response headers.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {stub.headers.map((row, index) => (
              <div
                key={`header-${index}`}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={row.enabled}
                  aria-label={`Enable header ${row.key || index + 1}`}
                  onChange={(event) =>
                    onChange({
                      headers: patchHeader(stub.headers, index, {
                        enabled: event.target.checked,
                      }),
                    })
                  }
                />
                <Input
                  className="min-w-[8rem] flex-1"
                  value={row.key}
                  aria-label={`Header ${index + 1} name`}
                  placeholder="Name"
                  onChange={(event) =>
                    onChange({
                      headers: patchHeader(stub.headers, index, {
                        key: event.target.value,
                      }),
                    })
                  }
                />
                <Input
                  className="min-w-[8rem] flex-1"
                  value={row.value}
                  aria-label={`Header ${index + 1} value`}
                  placeholder="Value"
                  onChange={(event) =>
                    onChange({
                      headers: patchHeader(stub.headers, index, {
                        value: event.target.value,
                      }),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`Remove header ${index + 1}`}
                  onClick={() =>
                    onChange({
                      headers: stub.headers.filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <FormGroup
        label="Body"
        htmlFor="mock-stub-body"
        description="JSON is parsed when valid; otherwise the body is sent as text."
      >
        <CodeEditor
          id="mock-stub-body"
          language="json"
          value={stub.body}
          onChange={(body) => onChange({ body })}
          minHeight="8rem"
          aria-label="Response body"
        />
      </FormGroup>
    </div>
  );
}
