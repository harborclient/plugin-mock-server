import { Button } from "@harborclient/sdk/components";
import type { MockStub } from "../types";
import { StubListItem } from "./StubListItem";

interface Props {
  /**
   * Stubs in match-priority order.
   */
  stubs: MockStub[];

  /**
   * Currently selected stub id, if any.
   */
  selectedId: string | null;

  /**
   * Selects a stub for editing.
   *
   * @param id - Stub id.
   */
  onSelect: (id: string) => void;

  /**
   * Replaces the stub list after an edit.
   *
   * @param next - Next stubs in order.
   */
  onChange: (next: MockStub[]) => void;

  /**
   * Adds a blank stub.
   */
  onAdd: () => void;
}

/**
 * Moves a stub by swapping with its neighbor.
 *
 * @param stubs - Current list.
 * @param index - Index to move.
 * @param delta - `-1` up or `1` down.
 */
function moveStub(stubs: MockStub[], index: number, delta: number): MockStub[] {
  const target = index + delta;
  if (target < 0 || target >= stubs.length) {
    return stubs;
  }
  const next = [...stubs];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next.map((stub, priority) => ({ ...stub, priority }));
}

/**
 * Scrollable stub list with enable/reorder/duplicate/delete actions.
 *
 * @param props - Component props.
 */
export function StubList({
  stubs,
  selectedId,
  onSelect,
  onChange,
  onAdd,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[14px] font-medium text-text">Stubs</h4>
        <Button type="button" variant="secondary" onClick={onAdd}>
          Add stub
        </Button>
      </div>
      <div
        className="min-h-0 flex-1 space-y-2 overflow-auto"
        role="list"
        aria-label="Mock stubs"
      >
        {stubs.length === 0 ? (
          <p className="text-[14px] text-muted">
            No stubs yet. Add one to start mocking.
          </p>
        ) : (
          stubs.map((stub, index) => (
            <div key={stub.id} role="listitem">
              <StubListItem
                stub={stub}
                selected={stub.id === selectedId}
                canMoveUp={index > 0}
                canMoveDown={index < stubs.length - 1}
                onSelect={() => onSelect(stub.id)}
                onToggleEnabled={(enabled) => {
                  onChange(
                    stubs.map((row) =>
                      row.id === stub.id ? { ...row, enabled } : row
                    )
                  );
                }}
                onMoveUp={() => onChange(moveStub(stubs, index, -1))}
                onMoveDown={() => onChange(moveStub(stubs, index, 1))}
                onDuplicate={() => {
                  const copy: MockStub = {
                    ...stub,
                    id:
                      typeof crypto !== "undefined" &&
                      typeof crypto.randomUUID === "function"
                        ? crypto.randomUUID()
                        : `stub-${Date.now()}`,
                    path: stub.path.endsWith("-copy")
                      ? stub.path
                      : `${stub.path}-copy`,
                  };
                  const next = [...stubs];
                  next.splice(index + 1, 0, copy);
                  onChange(next.map((row, priority) => ({ ...row, priority })));
                  onSelect(copy.id);
                }}
                onDelete={() => {
                  onChange(stubs.filter((row) => row.id !== stub.id));
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
