import { useEffect } from 'react';
import styles from './ResultScreen.module.css';

export default function ResultScreen({ G, ui, online, onPlayAgain, onMenu }) {
  const g = G.current;
  const { scores, names, mode } = ui;
  const s = online.side || 1;

  let isWin, isDraw;
  if (mode === 'online') {
    isWin = scores[s - 1] > scores[2 - s];
    isDraw = scores[0] === scores[1];
  } else {
    isWin = scores[0] > scores[1];
    isDraw = scores[0] === scores[1];
  }
  const type = isDraw ? 'draw' : isWin ? 'win' : 'lose';

  const emoji = { win: '🏆', lose: '😔', draw: '🤝' }[type];
  const title = { win: 'G\'alaba!', lose: 'Yutqazdingiz', draw: "Durrang!" }[type];
  const p1 = mode === 'online' && s === 2 ? names[1] : names[0];
  const p2 = mode === 'online' && s === 2 ? names[0] : names[1];

  return (
    <div className={styles.screen}>
      <div className={`${styles.card} ${styles[type]}`}>
        <div className={styles.halo}>
          <div className={styles.icon}>{emoji}</div>
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.desc}>{isDraw ? 'Teng kuchli o\'yin!' : isWin ? 'Ajoyib o\'yin!' : 'Keyingisida omad!'}</p>
        <div className={styles.scoreRow}>
          <div className={styles.scoreBox}>
            <div className={styles.scoreName}>{p1}</div>
            <div className={`${styles.scoreVal} ${styles.scoreP1}`}>{mode === 'online' && s === 2 ? scores[1] : scores[0]}</div>
          </div>
          <div className={styles.scoreSep}>:</div>
          <div className={styles.scoreBox}>
            <div className={styles.scoreName}>{p2}</div>
            <div className={`${styles.scoreVal} ${styles.scoreP2}`}>{mode === 'online' && s === 2 ? scores[0] : scores[1]}</div>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onPlayAgain}>
            {mode === 'online' ? '🏠 Bosh menyu' : '🔄 Qayta o\'ynash'}
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onMenu}>
            🏠 Bosh menyu
          </button>
        </div>
      </div>
    </div>
  );
}
