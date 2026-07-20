import { FormGroup, Input, Select } from "@harborclient/sdk/components";
import type { MockStub } from "../types";

const METHODS = [
  "*",
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

interface Props {
  /**
   * Stub being edited.
   */
  stub: MockStub;

  /**
   * Called when match fields change.
   *
   * @param patch - Partial stub updates.
   */
  onChange: (patch: Partial<MockStub>) => void;
}

/**
 * Match section: HTTP method and path pattern.
 *
 * @param props - Component props.
 */
export function MatchFields({ stub, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <FormGroup label="Method" htmlFor="mock-stub-method">
        <Select
          id="mock-stub-method"
          value={stub.method}
          aria-label="Stub HTTP method"
          onChange={(event) => onChange({ method: event.target.value })}
        >
          {METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </Select>
      </FormGroup>
      <FormGroup
        label="Path"
        htmlFor="mock-stub-path"
        description="Exact path, or trailing * for a prefix (for example /api/*)."
      >
        <Input
          id="mock-stub-path"
          value={stub.path}
          aria-label="Stub path pattern"
          onChange={(event) => onChange({ path: event.target.value })}
        />
      </FormGroup>
    </div>
  );
}
