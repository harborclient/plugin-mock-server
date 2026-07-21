import { CodeEditor, FormGroup } from "@harborclient/sdk/components";
import type { MockStub } from "../types";

interface Props {
  /**
   * Stub being edited.
   */
  stub: MockStub;

  /**
   * Called when script fields change.
   *
   * @param patch - Partial stub updates.
   */
  onChange: (patch: Partial<MockStub>) => void;
}

/**
 * Scripts section: Before and After editors for the selected stub.
 *
 * @param props - Component props.
 */
export function ScriptFields({ stub, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <FormGroup
        label="Before"
        htmlFor="mock-stub-before-script"
        description="Runs after this stub matches, before the canned response is used. Return a body value or { kind: 'http-response', ... } to override."
      >
        <CodeEditor
          id="mock-stub-before-script"
          language="javascript"
          value={stub.beforeScript ?? ""}
          onChange={(beforeScript) => onChange({ beforeScript })}
          minHeight="10rem"
          aria-label="Before script"
        />
      </FormGroup>

      <FormGroup
        label="After"
        htmlFor="mock-stub-after-script"
        description="Runs just before the response is sent. hc.response is the planned response (read-only). Return a body value or { kind: 'http-response', ... } to override."
      >
        <CodeEditor
          id="mock-stub-after-script"
          language="javascript"
          value={stub.afterScript ?? ""}
          onChange={(afterScript) => onChange({ afterScript })}
          minHeight="10rem"
          aria-label="After script"
        />
      </FormGroup>
    </div>
  );
}
