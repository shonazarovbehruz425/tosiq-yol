import React, { useState } from 'react';
import { broadcast } from './api.js';

export default function BroadcastModal({ totalUsers, onClose }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [status, setStatus] = useState(null); // {ok, msg}

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setStatus(null);
    const res = await broadcast(text.trim());
    setBusy(false);
    if (res.ok) {
      setStatus({ ok: true, msg: `Sent to ${res.sent} users${res.failed ? ` · ${res.failed} failed` : ''} ✓` });
      setText('');
      setConfirm(false);
    } else {
      setStatus({ ok: false, msg: res.error || 'Failed to send' });
      setConfirm(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Broadcast to all users</div>
            <div className="modal-sub">{totalUsers} user{totalUsers === 1 ? '' : 's'} will receive this</div>
          </div>
          <button className="modal-x" onClick={() => !busy && onClose()}>✕</button>
        </div>

        <textarea
          autoFocus
          rows={5}
          placeholder="Type a message to send to every user via the bot…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />

        {confirm && !busy && (
          <div className="del-warn">
            This sends your message to all {totalUsers} users. This cannot be undone.
          </div>
        )}

        {busy && (
          <div className="modal-status ok">Sending… this may take a moment for many users.</div>
        )}
        {status && (
          <div className={`modal-status ${status.ok ? 'ok' : 'err'}`}>{status.msg}</div>
        )}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            {status && status.ok ? 'Close' : 'Cancel'}
          </button>
          {!confirm ? (
            <button className="btn-send" onClick={() => setConfirm(true)} disabled={busy || !text.trim()}>
              Send to all
            </button>
          ) : (
            <button className="btn-danger" onClick={send} disabled={busy}>
              {busy ? 'Sending…' : `Confirm · send to ${totalUsers}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
