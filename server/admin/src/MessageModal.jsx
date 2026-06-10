import React, { useState } from 'react';
import { sendMessage } from './api.js';

export default function MessageModal({ user, onClose }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // {ok, msg}

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setStatus(null);
    const res = await sendMessage(user.id, text.trim());
    setBusy(false);
    if (res.ok) {
      setStatus({ ok: true, msg: 'Message sent ✓' });
      setText('');
      setTimeout(onClose, 900);
    } else {
      setStatus({ ok: false, msg: res.error || 'Failed to send' });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Send message</div>
            <div className="modal-sub">to {user.first_name || 'user'} · ID {user.id}</div>
          </div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <textarea
          autoFocus
          rows={4}
          placeholder="Type a message to send via the bot…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {status && (
          <div className={`modal-status ${status.ok ? 'ok' : 'err'}`}>{status.msg}</div>
        )}
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-send" onClick={send} disabled={busy || !text.trim()}>
            {busy ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
