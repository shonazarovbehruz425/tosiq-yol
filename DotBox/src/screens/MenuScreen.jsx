import { useState, useEffect, useRef } from 'react';
import { useT } from '../i18n/index.js';
import styles from './MenuScreen.module.css';

const SIZES = [
  { v: 3, label: '3 × 3', subKey: 'subFast' },
  { v: 4, label: '4 × 4', subKey: 'subClassic' },
  { v: 5, label: '5 × 5', subKey: 'subComplex' },
];
const DIFFS = [
  { v: 'easy',   labelKey: 'diffEasy',   subKey: 'diffEasyDesc',   color: '#10b981', gradFrom: '#10b981', gradTo: '#059669', bars: 1 },
  { v: 'medium', labelKey: 'diffMedium', subKey: 'diffMediumDesc', color: '#f59e0b', gradFrom: '#f59e0b', gradTo: '#d97706', bars: 2 },
  { v: 'hard',   labelKey: 'diffHard',   subKey: 'diffHardDesc',   color: '#ef4444', gradFrom: '#ef4444', gradTo: '#dc2626', bars: 3 },
];

function Panel({ children, className = '' }) {
  return <div key={Math.random()} className={`${styles.panel} ${className}`}>{children}</div>;
}

export default function MenuScreen({ step, onStep, online, onStartLocal, onStartBot, onJoinOnline, onCancelOnline, onCreateRoom, onJoinRoom, onCancelRoom }) {
  const t = useT();
  const [selSize, setSelSize] = useState(4);
  const [selDiff, setSelDiff] = useState('easy');
  const [botSize, setBotSize] = useState(4);
  const [selTimer, setSelTimer] = useState(0);
  const [selBlitz, setSelBlitz] = useState(0);
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
    if (c.length !== 4) { setCodeErr(t('enter4')); return; }
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
        <p className={styles.slogan}>{t('slogan')}</p>
      </header>

      {step === 'main' && (
        <Panel>
          <Pill primary blue onClick={() => onStep('online-size')}>
            <PillIcon color="rgba(255,255,255,.22)"><GlobeIcon /></PillIcon>
            {t('playOnline')}
          </Pill>
          <Pill onClick={() => onStep('friend')}>
            <PillIcon color="linear-gradient(135deg,#a78bfa,#7c3aed)"><FriendIcon /></PillIcon>
            {t('playFriend')}
            <Chevron />
          </Pill>
          <Pill onClick={() => onStep('diff')}>
            <PillIcon color="linear-gradient(135deg,#f97316,#dc2626)"><BotIcon /></PillIcon>
            {t('playBot')}
            <Chevron />
          </Pill>
          <Pill onClick={() => onStep('size')}>
            <PillIcon color="linear-gradient(135deg,#22d3ee,#0891b2)"><LocalIcon /></PillIcon>
            {t('playLocal')}
            <Chevron />
          </Pill>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button className={styles.backLink} onClick={() => window.parent.postMessage({ type: 'dotbox_exit' }, '*')}>
              ← {t('exitToWrongWay')}
            </button>
          </div>
        </Panel>
      )}

      {step === 'online-size' && (
        <Panel>
          <p className={styles.subTitle}>{t('chooseSize')}</p>
          {SIZES.map(({ v, label, subKey }) => (
            <SizePill key={v} selected={selSize === v} onClick={() => { setSelSize(v); onJoinOnline(v); }}>
              {label} <span>{t(subKey)}</span>
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
          <p className={styles.mmTitle}>{online.connecting ? t('connecting') : t('searchingOpponent')}</p>
          <p className={styles.mmSub}>{online.connecting ? t('connectingDesc') : t('waitSeconds')}</p>
          <button className={styles.backLink} onClick={onCancelOnline}>← {t('cancel')}</button>
        </Panel>
      )}

      {step === 'friend' && (
        <Panel>
          <p className={styles.subTitle}>{t('playFriend')}</p>
          <p className={styles.sectionLabel}>{t('newRoom')}</p>
          <div className={styles.sizeRow}>
            {SIZES.map(({ v, label }) => (
              <button key={v} className={`${styles.sizeChip} ${friendSize === v ? styles.sizeChipSel : ''}`}
                onClick={() => setFriendSize(v)}>{label}</button>
            ))}
          </div>
          <Pill primary onClick={() => onCreateRoom(friendSize)} disabled={online.connecting}>
            {online.connecting ? t('connecting') : `🔒 ${t('createRoom')}`}
          </Pill>
          <div className={styles.orDivider}>{t('or')}</div>
          <p className={styles.sectionLabel}>{t('enterCode')}</p>
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
          <Pill onClick={handleJoin}>▶ {t('join')}</Pill>
          <BackBtn onClick={() => onStep('main')} />
        </Panel>
      )}

      {step === 'friend-wait' && (
        <Panel className={styles.waitPanel}>
          <p className={styles.subTitle}>{t('roomCreated')}</p>
          <p className={styles.sectionLabel}>{t('sendCode')}</p>
          <div className={styles.roomCodeRow}>
            {(online.roomCode || '----').split('').map((ch, i) => (
              <div key={i} className={styles.roomCodeDigit}>{ch}</div>
            ))}
          </div>
          <div className={styles.spinner} />
          <p className={styles.waitHint}>{t('waitingFriend')}</p>
          <button className={styles.backLink} onClick={onCancelRoom}>← {t('cancel')}</button>
        </Panel>
      )}

      {step === 'diff' && (
        <Panel>
          <p className={styles.subTitle}>{t('chooseBotLevel')}</p>
          {DIFFS.map(({ v, labelKey, subKey, color, gradFrom, gradTo, bars }) => (
            <DiffCard key={v} color={color} gradFrom={gradFrom} gradTo={gradTo} bars={bars}
              selected={selDiff === v} onClick={() => { setSelDiff(v); onStep('bot-settings'); }}>
              <span className={styles.diffTitle} style={{color}}>{t(labelKey)}</span>
              <span className={styles.diffDesc}>{t(subKey)}</span>
            </DiffCard>
          ))}
          <BackBtn onClick={() => onStep('main')} />
        </Panel>
      )}

      {step === 'bot-settings' && (
        <Panel className={styles.settingsPanel}>
          <SettingsSection title={t('gameMode')}>
            <div className={styles.settingsCard}>
              <span className={styles.settingsCardIco}>🎮</span>
              <span className={styles.settingsCardLabel}>{t('botMode')}</span>
              <span className={styles.settingsCardSub}>{DIFFS.find(d => d.v === selDiff)?.labelKey ? t(DIFFS.find(d => d.v === selDiff).labelKey) : ''}</span>
            </div>
          </SettingsSection>

          <SettingsSection title={t('boardSize')}>
            <div className={styles.chipRow}>
              {SIZES.map(({ v, label, subKey }) => (
                <button key={v} className={`${styles.chip} ${botSize === v ? styles.chipSel : ''}`}
                  onClick={() => setBotSize(v)}>
                  <span className={styles.chipLabel}>{label}</span>
                  <span className={styles.chipSub}>{t(subKey)}</span>
                </button>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection title={t('timerTitle')}>
            <div className={styles.chipRow}>
              {[{v:0, k:'noLimit'},{v:180, k:'minutes3'},{v:300, k:'minutes5'}].map(({v, k}) => (
                <button key={v} className={`${styles.chip} ${styles.chipHalf} ${selTimer === v ? styles.chipSel : ''}`}
                  onClick={() => setSelTimer(v)}>
                  <span className={styles.chipLabel}>{t(k)}</span>
                </button>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection title={t('blitzTitle')}>
            <div className={styles.chipRow}>
              {[{v:0, k:'none'},{v:10, k:'seconds10'},{v:15, k:'seconds15'},{v:30, k:'seconds30'}].map(({v, k}) => (
                <button key={v} className={`${styles.chip} ${styles.chipQuarter} ${selBlitz === v ? styles.chipSel : ''}`}
                  onClick={() => setSelBlitz(v)}>
                  <span className={styles.chipLabel}>{t(k)}</span>
                </button>
              ))}
            </div>
          </SettingsSection>

          <button className={styles.startBtn} onClick={() => onStartBot(botSize, selDiff, {
            timerTotal: selTimer,
            blitzTime: selBlitz,
          })}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{width:18,height:18}}><path d="M8 5v14l11-7z"/></svg>
            {t('startGame')}
          </button>

          <BackBtn onClick={() => onStep('diff')} />
        </Panel>
      )}

      {step === 'size' && (
        <Panel>
          <p className={styles.subTitle}>{t('chooseSize')}</p>
          {SIZES.map(({ v, label, subKey }) => (
            <SizePill key={v} selected={selSize === v} onClick={() => onStartLocal(v)}>
              {label} <span>{t(subKey)}</span>
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
  return <BackBtnInner onClick={onClick} />;
}
function BackBtnInner({ onClick }) {
  const t = useT();
  return <button className={styles.backLink} onClick={onClick}>← {t('back')}</button>;
}

function DiffCard({ children, color, gradFrom, gradTo, bars, selected, onClick }) {
  return (
    <button className={`${styles.diffCard} ${selected ? styles.diffCardSel : ''}`}
      style={{'--dc': color, '--dc-from': gradFrom, '--dc-to': gradTo}} onClick={onClick}>
      <div className={styles.diffIcon} style={{background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`}}>
        {bars === 1 && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
        {bars === 2 && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
        {bars === 3 && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>}
      </div>
      <div className={styles.diffText}>{children}</div>
      <div className={styles.diffBars}>
        {[1,2,3].map(i => (
          <span key={i} className={`${styles.diffBar} ${i <= bars ? styles.diffBarOn : ''}`}
            style={{height: `${6 + i * 5}px`, background: i <= bars ? color : 'rgba(255,255,255,.1)'}} />
        ))}
      </div>
    </button>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div className={styles.settingsSection}>
      <p className={styles.settingsLabel}>{title}</p>
      {children}
    </div>
  );
}

const GlobeIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></svg>;
const FriendIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 19a4 4 0 0 0-8 0"/><circle cx="12" cy="9" r="3"/><path d="M5 19a3 3 0 0 1 4-2.8"/><path d="M19 19a3 3 0 0 0-4-2.8"/><circle cx="6.5" cy="10.5" r="2"/><circle cx="17.5" cy="10.5" r="2"/></svg>;
const BotIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><circle cx="9.5" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="1.2" fill="currentColor" stroke="none"/><path d="M2 13v3M22 13v3"/></svg>;
const LocalIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 19a4 4 0 0 0-8 0"/><circle cx="12" cy="9" r="3"/><path d="M5 19a3 3 0 0 1 4-2.8"/><path d="M19 19a3 3 0 0 0-4-2.8"/><circle cx="6.5" cy="10.5" r="2"/><circle cx="17.5" cy="10.5" r="2"/></svg>;
