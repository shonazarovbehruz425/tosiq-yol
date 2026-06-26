import { useState, useEffect, useRef } from 'react';
import styles from './MenuScreen.module.css';

const SIZES = [
  { v: 3, label: '3 × 3', sub: 'Tez o\'yin' },
  { v: 4, label: '4 × 4', sub: 'Klassik' },
  { v: 5, label: '5 × 5', sub: 'Murakkab' },
];
const DIFFS = [
  { v: 'easy',   label: 'Oson',   sub: 'Yangi boshlovchi', icon: '😊' },
  { v: 'medium', label: "O'rta",  sub: 'Tajribali',         icon: '🤖' },
  { v: 'hard',   label: 'Qiyin',  sub: 'Pro darajasi',      icon: '⭐' },
];

function Panel({ children, className = '' }) {
  return <div key={Math.random()} className={`${styles.panel} ${className}`}>{children}</div>;
}

export default function MenuScreen({ step, onStep, online, onStartLocal, onStartBot, onJoinOnline, onCancelOnline, onCreateRoom, onJoinRoom, onCancelRoom }) {
  const [selSize, setSelSize] = useState(4);
  const [selDiff, setSelDiff] = useState('easy');
  const [botSize, setBotSize] = useState(4);
  const [friendSize, setFriendSize] = useState(4);
  const [code, setCode] = useState(['','','','']);
  const [codeErr, setCodeErr] = useState('');
  const [mmSecs, setMmSecs] = useState(0);
  const mmRef = useRef(null);
  const inputs = useRef([]);

  useEffect(() => {
    if (step === 'online-mm') {
      setMmSecs(0);
      mmRef.current = setInterval(() => setMmSecs(s => s + 1), 1000);
    } else {
      clearInterval(mmRef.current);
    }
    return () => clearInterval(mmRef.current);
  }, [step]);

  const fmtTime = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  const handleCodeInput = (i, val) => {
    const v = val.toUpperCase().slice(-1);
    const next = [...code]; next[i] = v;
    setCode(next); setCodeErr('');
    if (v && i < 3) inputs.current[i + 1]?.focus();
  };
  const handleCodeKey = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  };
  const handleJoin = () => {
    const c = code.join('');
    if (c.length !== 4) { setCodeErr('4 ta belgi kiriting'); return; }
    setCode(['','','','']); setCodeErr('');
    onJoinRoom(c);
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="6" cy="6" r="2.5" fill="currentColor"/>
            <circle cx="18" cy="6" r="2.5" fill="currentColor"/>
            <circle cx="6" cy="18" r="2.5" fill="currentColor"/>
            <circle cx="18" cy="18" r="2.5" fill="currentColor"/>
            <path d="M6 6h12M6 18h12M6 6v12M18 6v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".45"/>
          </svg>
        </div>
        <h1 className={styles.title}>DOTS &amp; BOXES</h1>
        <p className={styles.slogan}>Mantiqiy Neon Jang</p>
      </header>

      {step === 'main' && (
        <Panel>
          <Pill primary blue onClick={() => onStep('online-size')}>
            <PillIcon color="rgba(255,255,255,.22)"><GlobeIcon /></PillIcon>
            Online O'ynash
          </Pill>
          <Pill onClick={() => onStep('friend')}>
            <PillIcon color="linear-gradient(135deg,#a78bfa,#7c3aed)"><FriendIcon /></PillIcon>
            Do'st bilan O'ynash
            <Chevron />
          </Pill>
          <Pill onClick={() => onStep('diff')}>
            <PillIcon color="linear-gradient(135deg,#f97316,#dc2626)"><BotIcon /></PillIcon>
            Bot bilan O'ynash
            <Chevron />
          </Pill>
          <Pill onClick={() => onStep('size')}>
            <PillIcon color="linear-gradient(135deg,#22d3ee,#0891b2)"><LocalIcon /></PillIcon>
            Lokal O'ynash
            <Chevron />
          </Pill>
        </Panel>
      )}

      {step === 'online-size' && (
        <Panel>
          <p className={styles.subTitle}>Maydon o'lchamini tanlang</p>
          {SIZES.map(({ v, label, sub }) => (
            <SizePill key={v} selected={selSize === v} onClick={() => { setSelSize(v); onJoinOnline(v); }}>
              {label} <span>{sub}</span>
            </SizePill>
          ))}
          <BackBtn onClick={() => onStep('main')} />
        </Panel>
      )}

      {step === 'online-mm' && (
        <Panel className={styles.mmPanel}>
          <div className={styles.mmOrb} onClick={onCancelOnline}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </div>
          <div className={styles.mmTimer}>{fmtTime(mmSecs)}</div>
          <p className={styles.mmTitle}>{online.connecting ? 'Ulanmoqda…' : 'Raqib axtarilmoqda…'}</p>
          <p className={styles.mmSub}>{online.connecting ? 'Server bilan bog\'lanish o\'rnatilmoqda' : 'Bir necha soniya kutib turing'}</p>
          <button className={styles.backLink} onClick={onCancelOnline}>← Bekor qilish</button>
        </Panel>
      )}

      {step === 'friend' && (
        <Panel>
          <p className={styles.subTitle}>Do'st bilan O'ynash</p>
          <p className={styles.sectionLabel}>Yangi xona yaratish</p>
          <div className={styles.sizeRow}>
            {SIZES.map(({ v, label }) => (
              <button key={v} className={`${styles.sizeChip} ${friendSize === v ? styles.sizeChipSel : ''}`}
                onClick={() => setFriendSize(v)}>{label}</button>
            ))}
          </div>
          <Pill primary onClick={() => onCreateRoom(friendSize)} disabled={online.connecting}>
            {online.connecting ? 'Ulanmoqda…' : '🔒 Xona yaratish'}
          </Pill>
          <div className={styles.orDivider}>yoki</div>
          <p className={styles.sectionLabel}>Xona kodini kiriting</p>
          <div className={styles.codeRow}>
            {code.map((v, i) => (
              <input key={i} ref={el => inputs.current[i] = el}
                className={styles.codeInput} maxLength={1} inputMode="text"
                value={v}
                onChange={e => handleCodeInput(i, e.target.value)}
                onKeyDown={e => handleCodeKey(i, e)}
                autoComplete="off"
              />
            ))}
          </div>
          {codeErr && <p className={styles.codeErr}>{codeErr}</p>}
          <Pill onClick={handleJoin}>▶ Kirish</Pill>
          <BackBtn onClick={() => onStep('main')} />
        </Panel>
      )}

      {step === 'friend-wait' && (
        <Panel className={styles.waitPanel}>
          <p className={styles.subTitle}>Xona yaratildi!</p>
          <p className={styles.sectionLabel}>Xona kodi — do'stingizga yuboring</p>
          <div className={styles.roomCodeRow}>
            {(online.roomCode || '----').split('').map((ch, i) => (
              <div key={i} className={styles.roomCodeDigit}>{ch}</div>
            ))}
          </div>
          <div className={styles.spinner} />
          <p className={styles.waitHint}>Do'stingiz kirishini kutmoqda…</p>
          <button className={styles.backLink} onClick={onCancelRoom}>← Bekor qilish</button>
        </Panel>
      )}

      {step === 'diff' && (
        <Panel>
          <p className={styles.subTitle}>Bot darajasini tanlang</p>
          {DIFFS.map(({ v, label, sub, icon }) => (
            <SizePill key={v} selected={selDiff === v} onClick={() => { setSelDiff(v); onStep('bot-size'); }}>
              {icon} {label} <span>{sub}</span>
            </SizePill>
          ))}
          <BackBtn onClick={() => onStep('main')} />
        </Panel>
      )}

      {step === 'bot-size' && (
        <Panel>
          <p className={styles.subTitle}>Maydon o'lchamini tanlang</p>
          {SIZES.map(({ v, label }) => (
            <SizePill key={v} selected={botSize === v} onClick={() => { setBotSize(v); onStartBot(v, selDiff); }}>
              {label}
            </SizePill>
          ))}
          <BackBtn onClick={() => onStep('diff')} />
        </Panel>
      )}

      {step === 'size' && (
        <Panel>
          <p className={styles.subTitle}>Maydon o'lchamini tanlang</p>
          {SIZES.map(({ v, label, sub }) => (
            <SizePill key={v} selected={selSize === v} onClick={() => onStartLocal(v)}>
              {label} <span>{sub}</span>
            </SizePill>
          ))}
          <BackBtn onClick={() => onStep('main')} />
        </Panel>
      )}
    </div>
  );
}

function Pill({ children, onClick, primary, blue, disabled }) {
  return (
    <button
      className={`${styles.pill} ${primary ? styles.pillPrimary : ''} ${blue ? styles.pillBlue : ''}`}
      onClick={disabled ? undefined : onClick}
      style={disabled ? {opacity:.6,pointerEvents:'none'} : undefined}
    >
      {children}
    </button>
  );
}
function PillIcon({ children, color }) {
  return <span className={styles.pillIcon} style={{background: color}}>{children}</span>;
}
function Chevron() {
  return (
    <span className={styles.chevron}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M9 6l6 6-6 6"/>
      </svg>
    </span>
  );
}
function SizePill({ children, selected, onClick }) {
  return (
    <button className={`${styles.sizePill} ${selected ? styles.sizePillSel : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}
function BackBtn({ onClick }) {
  return <button className={styles.backLink} onClick={onClick}>← Orqaga</button>;
}
const GlobeIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></svg>;
const FriendIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 19a4 4 0 0 0-8 0"/><circle cx="12" cy="9" r="3"/><path d="M5 19a3 3 0 0 1 4-2.8"/><path d="M19 19a3 3 0 0 0-4-2.8"/><circle cx="6.5" cy="10.5" r="2"/><circle cx="17.5" cy="10.5" r="2"/></svg>;
const BotIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><circle cx="9.5" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="1.2" fill="currentColor" stroke="none"/><path d="M2 13v3M22 13v3"/></svg>;
const LocalIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 19a4 4 0 0 0-8 0"/><circle cx="12" cy="9" r="3"/><path d="M5 19a3 3 0 0 1 4-2.8"/><path d="M19 19a3 3 0 0 0-4-2.8"/><circle cx="6.5" cy="10.5" r="2"/><circle cx="17.5" cy="10.5" r="2"/></svg>;
