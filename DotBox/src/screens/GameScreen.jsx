import GameBoard from '../components/GameBoard.jsx';
import { playReaction } from '../audio/sounds.js';
import styles from './GameScreen.module.css';

const REACTIONS = [
  { key:'laugh', color:'#34d399', label:'😄' },
  { key:'fire',  color:'#f97316', label:'🔥' },
  { key:'wow',   color:'#a78bfa', label:'😮' },
  { key:'angry', color:'#fb7185', label:'😤' },
  { key:'wave',  color:'#38bdf8', label:'👋' },
];

export default function GameScreen({ G, ui, online, onMove, onUndo, onBack, sync }) {
  const { scores, cur, over, aiOn, names, mode } = ui;
  const myTurn = mode === 'online' ? cur === online.side : true;
  const isOnline = mode === 'online';

  const turnText = aiOn ? 'Bot o\'ylamoqda…'
    : over ? 'O\'yin tugadi!'
    : !myTurn && isOnline ? `${names[1-((online.side||1)-1)]} navbati`
    : 'Sizning navbatingiz';

  return (
    <div className={styles.screen}>
      {/* Header */}
      <header className={styles.hdr}>
        <button className={styles.icoBtn} onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className={styles.title}>DOTS &amp; BOXES</span>
        <button className={styles.icoBtn} onClick={() => { G.current.aiOn = false; G.current.over = false; G.current.history = []; G.current.hL=Array.from({length:G.current.size+1},()=>Array(G.current.size).fill(0));G.current.vL=Array.from({length:G.current.size},()=>Array(G.current.size+1).fill(0));G.current.boxes=Array.from({length:G.current.size},()=>Array(G.current.size).fill(0));G.current.scores=[0,0];G.current.cur=1;G.current.moveCount=0;sync(); }} disabled={isOnline}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
      </header>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        <div className={`${styles.scard} ${cur===1&&!over?styles.scardActive1:''}`}>
          <div className={styles.sname}>{names[0]}</div>
          <div className={`${styles.sval} ${styles.sval1}`}>{scores[0]}</div>
        </div>
        <div className={styles.vs}>VS</div>
        <div className={`${styles.scard} ${cur===2&&!over?styles.scardActive2:''}`}>
          <div className={styles.sname}>{names[1]}</div>
          <div className={`${styles.sval} ${styles.sval2}`}>{scores[1]}</div>
        </div>
      </div>

      {/* Turn bar */}
      <div className={styles.tbar}>
        <span className={`${styles.tpip} ${cur===1?styles.pip1:styles.pip2}`} />
        <span className={styles.ttxt}>{turnText}</span>
        {aiOn && <span className={styles.thinking}><span/><span/><span/></span>}
      </div>

      {/* Canvas */}
      <div className={styles.canvasWrap}>
        <GameBoard G={G} onMove={onMove} online={online} sync={sync} />
      </div>

      {/* Reactions */}
      <div className={styles.rxStrip}>
        {REACTIONS.map(({ key, color, label }) => (
          <button key={key} className={styles.rxBtn}
            style={{ '--rc': color }}
            onClick={() => { try { playReaction(key); } catch {} }}>
            {label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.undoBtn} onClick={onUndo} disabled={isOnline || !G.current?.history?.length || aiOn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7h10a5 5 0 0 1 0 10H3"/><path d="M7 3l-4 4 4 4"/></svg>
          Bekor
        </button>
      </div>
    </div>
  );
}
