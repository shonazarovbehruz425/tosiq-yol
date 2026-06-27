import { useEffect } from 'react';
import { useT } from '../i18n/index.js';
import styles from './ResultScreen.module.css';

export default function ResultScreen({ G, ui, online, onPlayAgain, onMenu }) {
  const t = useT();
  const g = G.current;
  const { scores, names, mode } = ui;
  const s = online.side || 1;

  const forfeit = !!g.forfeit;
  let isWin, isDraw;
  if (mode === 'online') {
    isWin = scores[s - 1] > scores[2 - s];
    isDraw = scores[0] === scores[1];
  } else {
    isWin = scores[0] > scores[1];
    isDraw = scores[0] === scores[1];
  }
  if (forfeit) { isWin = false; isDraw = false; }
  const type = isDraw ? 'draw' : isWin ? 'win' : 'lose';

  const emoji = { win: '🏆', lose: '😔', draw: '🤝' }[type];
  const title = { win: t('resWin'), lose: t('resLose'), draw: t('resDraw') }[type];
  const p1 = mode === 'online' && s === 2 ? names[1] : names[0];
  const p2 = mode === 'online' && s === 2 ? names[0] : names[1];

  return (
    <div className={styles.screen}>
      <div className={`${styles.card} ${styles[type]}`}>
        <div className={styles.halo}>
          <div className={styles.icon}>{emoji}</div>
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.desc}>{forfeit ? t('descForfeit') : isDraw ? t('descDraw') : isWin ? t('descWin') : t('descLose')}</p>
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
            {mode === 'online' ? `🏠 ${t('mainMenu')}` : `🔄 ${t('playAgain')}`}
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onMenu}>
            🏠 {t('mainMenu')}
          </button>
        </div>
      </div>
    </div>
  );
}
