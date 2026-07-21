import { useState } from "@harborclient/sdk/react";
import type { MockStub } from "../types";
import { MatchFields } from "./MatchFields";
import { RespondFields } from "./RespondFields";
import { ScriptFields } from "./ScriptFields";

interface Props {
  /**
   * Selected stub to edit.
   */
  stub: MockStub;

  /**
   * Called when any stub field changes.
   *
   * @param patch - Partial updates merged into the stub.
   */
  onChange: (patch: Partial<MockStub>) => void;
}

type EditorTab = "match" | "respond" | "scripts";

/**
 * Match/Respond/Scripts editor for the selected stub.
 *
 * @param props - Component props.
 */
export function StubEditor({ stub, onChange }: Props) {
  const [tab, setTab] = useState<EditorTab>("match");

  /**
   * Returns button classes for a stub editor tab.
   *
   * @param id - Tab id to style.
   */
  function tabClass(id: EditorTab): string {
    return `cursor-pointer rounded border px-3 py-1 text-[14px] ${
      tab === id
        ? "border-accent bg-panel text-text"
        : "border-separator bg-control text-muted"
    }`;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div
        className="flex gap-2"
        role="tablist"
        aria-label="Stub editor sections"
      >
        <button
          type="button"
          role="tab"
          id="mock-tab-match"
          aria-selected={tab === "match"}
          aria-controls="mock-panel-match"
          className={tabClass("match")}
          onClick={() => setTab("match")}
        >
          Match
        </button>
        <button
          type="button"
          role="tab"
          id="mock-tab-respond"
          aria-selected={tab === "respond"}
          aria-controls="mock-panel-respond"
          className={tabClass("respond")}
          onClick={() => setTab("respond")}
        >
          Respond
        </button>
        <button
          type="button"
          role="tab"
          id="mock-tab-scripts"
          aria-selected={tab === "scripts"}
          aria-controls="mock-panel-scripts"
          className={tabClass("scripts")}
          onClick={() => setTab("scripts")}
        >
          Scripts
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "match" ? (
          <div
            role="tabpanel"
            id="mock-panel-match"
            aria-labelledby="mock-tab-match"
          >
            <MatchFields stub={stub} onChange={onChange} />
          </div>
        ) : null}
        {tab === "respond" ? (
          <div
            role="tabpanel"
            id="mock-panel-respond"
            aria-labelledby="mock-tab-respond"
          >
            <RespondFields stub={stub} onChange={onChange} />
          </div>
        ) : null}
        {tab === "scripts" ? (
          <div
            role="tabpanel"
            id="mock-panel-scripts"
            aria-labelledby="mock-tab-scripts"
          >
            <ScriptFields stub={stub} onChange={onChange} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
