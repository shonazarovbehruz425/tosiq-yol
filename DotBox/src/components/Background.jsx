import styles from './Background.module.css';

const WALLS = [
  ['h','red',12,14,16,0],['h','blue',64,9,19,-5],['v','blue',8,52,18,-3],
  ['h','red',78,60,17,-7],['h','blue',22,82,20,-9],['v','red',88,30,15,-6],
  ['v','blue',44,70,21,-11],['h','red',52,38,18,-13],
];
const PAWNS = [['red',56,68,8,0],['blue',30,26,9,-3],['red',82,46,10,-5],['blue',16,74,8.5,-2]];

export default function Background() {
  return (
    <div className={styles.qbg} aria-hidden="true">
      <div className={styles.grid} />
      <div className={styles.items}>
        {WALLS.map(([t,c,l,top,dur,del],i) => (
          <span key={i} className={`${styles.wall} ${styles[t]} ${styles[c]}`}
            style={{left:`${l}%`,top:`${top}%`,animationDuration:`${dur}s`,animationDelay:`${del}s`}} />
        ))}
        {PAWNS.map(([c,l,top,dur,del],i) => (
          <span key={i} className={`${styles.pawn} ${styles[c]}`}
            style={{left:`${l}%`,top:`${top}%`,animationDuration:`${dur}s`,animationDelay:`${del}s`}} />
        ))}
      </div>
    </div>
  );
}
