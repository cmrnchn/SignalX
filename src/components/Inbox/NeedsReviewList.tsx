import type { ContactMeta, Customer, GroupMeta, OutboxItem, PendingReply } from "../../api";
import { fmtTime, threadTitle } from "../../format";

type Props = {
  drafts: PendingReply[];
  outbox: OutboxItem[];
  contacts: ContactMeta[];
  groups: GroupMeta[];
  customers: Customer[];
  onApproveDraft: (p: PendingReply) => void;
  onEditDraft: (p: PendingReply) => void;
  onDiscardDraft: (p: PendingReply) => void;
  onRetryOutbox: (id: string) => void;
  onDiscardOutbox: (id: string) => void;
  onOpenThread: (threadId: string) => void;
};

/** Flat queue of AI drafts awaiting approval plus queued/failed sends. */
export function NeedsReviewList({
  drafts,
  outbox,
  contacts,
  groups,
  customers,
  onApproveDraft,
  onEditDraft,
  onDiscardDraft,
  onRetryOutbox,
  onDiscardOutbox,
  onOpenThread,
}: Props) {
  const title = (threadId: string) => threadTitle(threadId, contacts, groups, customers);
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
      {outbox.map((o) => (
        <div key={o.id} className={`outbox-row state-${o.state}`}>
          <div className="outbox-to">
            <strong>{title(o.thread_id)}</strong>
            {o.attachment_path ? <span className="convo-sub">Attachment</span> : null}
          </div>
          <div className="outbox-preview">
            {o.content.slice(0, 120) || (o.attachment_path ? "(attachment)" : "(empty)")}
            {o.content.length > 120 ? "…" : ""}
            {o.last_error && <div className="bubble-err">{o.last_error}</div>}
          </div>
          <span
            className={`status-pill status-${
              o.state === "failed" ? "danger" : o.state === "sending" ? "warn" : "muted"
            }`}
          >
            {o.state}
          </span>
          <span className="outbox-age">
            {fmtTime(o.created_at)}
            {o.attempt_count > 0 ? ` · ${o.attempt_count}` : ""}
          </span>
          <div className="row-actions">
            {o.state === "failed" && (
              <button type="button" className="action-btn primary" onClick={() => onRetryOutbox(o.id)}>
                Retry
              </button>
            )}
            <button type="button" className="ghost-btn" onClick={() => onDiscardOutbox(o.id)}>
              Discard
            </button>
            <button type="button" className="ghost-btn" onClick={() => onOpenThread(o.thread_id)}>
              Open
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
