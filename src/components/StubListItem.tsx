import type { MockStub } from "../types";

interface Props {
  /**
   * Stub shown in this list row.
   */
  stub: MockStub;

  /**
   * Whether this stub is currently selected for editing.
   */
  selected: boolean;

  /**
   * Called when the row is activated.
   */
  onSelect: () => void;

  /**
   * Called when the enable toggle changes.
   *
   * @param enabled - Next enabled state.
   */
  onToggleEnabled: (enabled: boolean) => void;

  /**
   * Moves this stub earlier in match priority.
   */
  onMoveUp: () => void;

  /**
   * Moves this stub later in match priority.
   */
  onMoveDown: () => void;

  /**
   * Whether Move up is available.
   */
  canMoveUp: boolean;

  /**
   * Whether Move down is available.
   */
  canMoveDown: boolean;

  /**
   * Duplicates this stub.
   */
  onDuplicate: () => void;

  /**
   * Deletes this stub.
   */
  onDelete: () => void;
}

/**
 * Summarizes content-type from stub headers for the list row.
 *
 * @param stub - Stub to summarize.
 */
function contentTypeSummary(stub: MockStub): string {
  const header = stub.headers.find(
    (row) => row.enabled && row.key.trim().toLowerCase() === "content-type"
  );
  if (header?.value) {
    return header.value.split(";")[0]?.trim() || "json";
  }
  const trimmed = stub.body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json";
  }
  return "text";
}

/**
 * One selectable stub row in the mock server list.
 * The whole row is clickable via a stretched overlay button; checkbox and
 * action controls sit above it so they remain independently interactive.
 *
 * @param props - Component props.
 */
export function StubListItem({
  stub,
  selected,
  onSelect,
  onToggleEnabled,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDuplicate,
  onDelete,
}: Props) {
  return (
    <div
      className={`group relative flex items-center gap-2 rounded border px-2 py-2 ${
        selected ? "border-accent bg-panel" : "border-separator bg-control"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer rounded border-0 bg-transparent p-0"
        aria-label={`Select stub ${stub.method} ${stub.path}`}
        aria-current={selected ? "true" : undefined}
        onClick={onSelect}
      />
      <input
        type="checkbox"
        className="relative z-10 shrink-0"
        checked={stub.enabled}
        aria-label={`Enable stub ${stub.method} ${stub.path}`}
        onChange={(event) => onToggleEnabled(event.target.checked)}
      />
      <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[14px] font-medium text-text">
            {stub.method}
          </span>
          <span className="truncate font-mono text-[14px] text-text">
            {stub.path}
          </span>
        </div>
        <div className="mt-0.5 text-[14px] text-muted">
          {stub.status} · {contentTypeSummary(stub)}
          {stub.delayMs > 0 ? ` · ${stub.delayMs}ms` : ""}
        </div>
      </div>
      <div className="relative z-10 flex shrink-0 items-center gap-2 opacity-0 focus-within:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 text-[14px] text-muted hover:text-text disabled:opacity-40"
          aria-label="Move stub up"
          disabled={!canMoveUp}
          onClick={onMoveUp}
        >
          ↑
        </button>
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 text-[14px] text-muted hover:text-text disabled:opacity-40"
          aria-label="Move stub down"
          disabled={!canMoveDown}
          onClick={onMoveDown}
        >
          ↓
        </button>
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 text-[14px] text-muted hover:text-text"
          aria-label="Duplicate stub"
          onClick={onDuplicate}
        >
          Dup
        </button>
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 text-[14px] text-danger hover:underline"
          aria-label="Delete stub"
          onClick={onDelete}
        >
          Del
        </button>
      </div>
    </div>
  );
}
