import { useMemo, useState } from "react";
import type { ContactMeta, Customer, GroupMeta, OutboxItem, PendingReply } from "../../api";
import { fmtTime, threadTitle } from "../../format";

type SortColumn = "created_at" | "thread_id" | "state" | "attempt_count";
type Sort = { column: SortColumn; asc: boolean };

type Props = {
  drafts: PendingReply[];
  outbox: OutboxItem[];
  contacts: ContactMeta[];
  groups: GroupMeta[];
  customers: Customer[];
  onApproveDraft: (p: PendingReply) => void;
  onEditDraft: (p: PendingReply) => void;
  onDiscardDraft: (p: PendingReply) => void;
  onRefresh: () => Promise<void>;
  onRetryOutbox: (id: string) => Promise<void>;
  onDiscardOutbox: (id: string) => Promise<void>;
  onOpenThread: (threadId: string) => void;
};

/**
 * Flat queue of AI drafts awaiting approval, then queued/failed sends
 * (sortable, multi-select, bulk retry/clear — formerly the Outbox screen).
 */
export function NeedsReviewList({
  drafts,
  outbox,
  contacts,
  groups,
  customers,
  onApproveDraft,
  onEditDraft,
  onDiscardDraft,
  onRefresh,
  onRetryOutbox,
  onDiscardOutbox,
  onOpenThread,
}: Props) {
  const [selectedRaw, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>({ column: "created_at", asc: false });

  const title = (threadId: string) => threadTitle(threadId, contacts, groups, customers);

  // Drop selections for sends that have since left the queue.
  const selected = useMemo(
    () => new Set(outbox.filter((o) => selectedRaw.has(o.id)).map((o) => o.id)),
    [outbox, selectedRaw],
  );

  const counts = useMemo(
    () => ({
      queued: outbox.filter((o) => o.state === "queued").length,
      sending: outbox.filter((o) => o.state === "sending").length,
      failed: outbox.filter((o) => o.state === "failed").length,
    }),
    [outbox],
  );

  const sorted = useMemo(
    () =>
      [...outbox].sort((a, b) => {
        let cmp = 0;
        switch (sort.column) {
          case "thread_id":
            cmp = title(a.thread_id).localeCompare(title(b.thread_id));
            break;
          case "state":
            cmp = a.state.localeCompare(b.state);
            break;
          case "attempt_count":
            cmp = (a.attempt_count || 0) - (b.attempt_count || 0);
            break;
          default:
            cmp = b.created_at - a.created_at;
        }
        return sort.asc ? cmp : -cmp;
      }),
    [outbox, sort, contacts, groups, customers],
  );

  const selectedFailed = outbox.filter((o) => selected.has(o.id) && o.state === "failed").map((o) => o.id);

  const toggleSort = (column: SortColumn) =>
    setSort((s) => ({ column, asc: s.column === column ? !s.asc : false }));

  const sortMark = (column: SortColumn) => sort.column === column && (sort.asc ? "▲" : "▼");

  const toggleSelected = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const afterBulk = () => {
    setSelected(new Set());
    void onRefresh();
  };

  return (
    <div className="thread-list outbox-table">
      {drafts.length + outbox.length === 0 && <p className="empty">Nothing needs your attention.</p>}
      {drafts.map((p) => (
        <div key={`${p.thread_id}:${p.message_id}`} className="outbox-row state-queued">
          <div className="outbox-to">
            <strong>{title(p.thread_id)}</strong>
            <span className="convo-sub">AI draft</span>
          </div>
          <div className="outbox-preview">
            {p.draft.slice(0, 120)}
            {p.draft.length > 120 ? "…" : ""}
          </div>
          <span className="status-pill status-warn">awaiting review</span>
          <span className="outbox-age">{fmtTime(p.created_at)}</span>
          <div className="row-actions">
            <button type="button" className="action-btn primary" onClick={() => onApproveDraft(p)}>
              Send
            </button>
            <button type="button" className="ghost-btn" onClick={() => onEditDraft(p)}>
              Edit
            </button>
            <button type="button" className="ghost-btn" onClick={() => onDiscardDraft(p)}>
              Discard
            </button>
          </div>
        </div>
      ))}
      {outbox.length > 0 && (
        <>
          <div className="filter-strip">
            <span className="col-meta">
              {counts.queued} queued · {counts.sending} sending · {counts.failed} failed
            </span>
            <button type="button" className="action-btn" onClick={() => void onRefresh()}>
              Refresh
            </button>
            {selected.size > 0 && (
              <>
                <span className="col-meta">{selected.size} selected</span>
                <button
                  type="button"
                  className="action-btn"
                  disabled={selectedFailed.length === 0}
                  onClick={() => {
                    if (selectedFailed.length > 0) {
                      void Promise.all(selectedFailed.map((id) => onRetryOutbox(id))).then(afterBulk);
                    }
                  }}
                >
                  Retry all
                </button>
                <button
                  type="button"
                  className="action-btn danger"
                  onClick={() => {
                    if (confirm(`Delete ${selected.size} message${selected.size === 1 ? "" : "s"}?`)) {
                      void Promise.all(Array.from(selected).map((id) => onDiscardOutbox(id))).then(afterBulk);
                    }
                  }}
                >
                  Clear selected
                </button>
              </>
            )}
          </div>
          <div className="outbox-head">
            <span onClick={() => toggleSort("thread_id")} title="Click to sort">
              To {sortMark("thread_id")}
            </span>
            <span>Preview</span>
            <span onClick={() => toggleSort("state")} title="Click to sort">
              Status {sortMark("state")}
            </span>
            <span onClick={() => toggleSort("attempt_count")} title="Click to sort">
              Attempts {sortMark("attempt_count")}
            </span>
            <span>Actions</span>
          </div>
        </>
      )}
      {sorted.map((o) => (
        <div key={o.id}>
          <div
            className={`outbox-row state-${o.state} ${selected.has(o.id) ? "selected" : ""}`}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== "BUTTON") toggleSelected(o.id);
            }}
            style={{ cursor: "pointer" }}
          >
            <div className="outbox-to">
              <strong>{title(o.thread_id)}</strong>
            </div>
            <div className="outbox-preview">
              {o.attachment_path && <span className="attach-chip">📎</span>}
              {o.content.slice(0, 100) || (o.attachment_path ? "(attachment)" : "(empty)")}
              {o.content.length > 100 ? "…" : ""}
            </div>
            <span
              className={`status-pill status-${
                o.state === "failed" ? "danger" : o.state === "sending" ? "warn" : "muted"
              }`}
            >
              {o.state}
            </span>
            <span className="outbox-attempts">
              {o.attempt_count > 0 ? `${o.attempt_count} attempt${o.attempt_count === 1 ? "" : "s"}` : "—"}
            </span>
            <div className="row-actions">
              {o.state === "failed" && (
                <button
                  type="button"
                  className="action-btn primary"
                  onClick={() => void onRetryOutbox(o.id).then(onRefresh)}
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  if (confirm("Delete this message from the queue?")) {
                    void onDiscardOutbox(o.id).then(onRefresh);
                  }
                }}
              >
                Discard
              </button>
              <button type="button" className="ghost-btn" onClick={() => onOpenThread(o.thread_id)}>
                Open
              </button>
            </div>
          </div>
          {o.last_error && (
            <div className="outbox-error">
              <span className="error-icon">⚠️</span>
              <div>
                <div className="error-message">This number isn't on Signal</div>
                <div className="error-detail">{o.last_error}</div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
