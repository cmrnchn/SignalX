import type { PendingReply } from "../../api";
import { IconImage } from "../../navIcons";

type Props = {
  value: string;
  onChange: (value: string) => void;
  attachFile: File | null;
  attachPreview: string | null;
  /** Replace (or clear, with null) the pending attachment. */
  onAttach: (file: File | null) => void;
  sending: boolean;
  /** Blocks sending entirely, e.g. while a daemon restart is pending. */
  blocked: boolean;
  onSend: () => void;
  /** Unreviewed AI drafts for this thread, shown as review cards above the input. */
  drafts: PendingReply[];
  onApproveDraft: (p: PendingReply) => void;
  onEditDraft: (p: PendingReply) => void;
  onDiscardDraft: (p: PendingReply) => void;
};

/** Message input with an optional single attachment. Enter sends. */
export function Composer({
  value,
  onChange,
  attachFile,
  attachPreview,
  onAttach,
  sending,
  blocked,
  onSend,
  drafts,
  onApproveDraft,
  onEditDraft,
  onDiscardDraft,
}: Props) {
  return (
    <>
    {drafts.map((p) => (
      <div key={p.message_id} className="summary-box">
        <div className="summary-head">
          <strong>AI drafted a reply — review before sending</strong>
        </div>
        <p>{p.draft}</p>
        <div className="row-actions">
          <button
            type="button"
            className="action-btn primary"
            disabled={sending || blocked}
            onClick={() => onApproveDraft(p)}
          >
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
    <div className="composer">
      {attachPreview && (
        <div className="attach-chip">
          <img src={attachPreview} alt="" />
          <span>{attachFile?.name || "Attachment"}</span>
          <button type="button" className="ghost-btn" onClick={() => onAttach(null)}>
            Remove
          </button>
        </div>
      )}
      <div className="composer-row">
        <label className="attach-btn" title="Attach image or file">
          <IconImage />
          <input
            type="file"
            accept="image/*,.pdf,.txt,.csv"
            onChange={(e) => {
              onAttach(e.target.files?.[0] || null);
              e.target.value = "";
            }}
          />
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Write a message…"
          rows={3}
          title="Enter to send, Shift+Enter for newline"
        />
        <button
          type="button"
          className="send-btn"
          disabled={sending || blocked || (!value.trim() && !attachFile)}
          onClick={onSend}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
    </>
  );
}
