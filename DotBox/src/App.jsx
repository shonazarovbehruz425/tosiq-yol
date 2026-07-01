import { useState, useRef, useCallback, useEffect } from 'react';
import Background from './components/Background.jsx';
import MenuScreen from './screens/MenuScreen.jsx';
import GameScreen from './screens/GameScreen.jsx';
import ResultScreen from './screens/ResultScreen.jsx';
import { createGame } from './game/state.js';
import { makeMove, undoMove, applyOpponentMove } from './game/logic.js';
import { pickAI } from './game/ai.js';
import { playSnap, playBoxDing, playWin, playLose, stopNoise, preloadMemes, unlockAudio } from './audio/sounds.js';
import * as ws from './ws/client.js';
import { t } from './i18n/index.js';
import styles from './App.module.css';

const meName = () => (window.__dbMe && window.__dbMe.name) || t('nameYou');

export default function App() {
  const [screen, setScreen] = useState('menu');   // 'menu' | 'game' | 'result'
  const [menuStep, setMenuStep] = useState('main');

  // Mutable game object — updates don't cause re-renders (canvas draws directly)
  const G = useRef(createGame());

  // React UI state (drives scoreboard, turn bar, button states)
  const [ui, setUi] = useState({ scores: [0,0], cur: 1, over: false, aiOn: false, mode: 'local', size: 4, names: [meName(), t('nameOpponent')] });

  // Online state
  const [online, setOnline] = useState({ roomCode: null, side: 0, connecting: false });

  // Sync UI from game ref
  const sync = useCallback(() => {
    const g = G.current;
    setUi(prev => ({ ...prev, scores: [...g.scores], cur: g.cur, over: g.over, aiOn: g.aiOn, size: g.size, mode: g.mode }));
  }, []);

  // Launch a game
  const launch = useCallback((size, mode, diff, names = null, opts = {}) => {
    const g = createGame(size, mode, diff, opts);
    G.current = g;
    const playerNames = names || [meName(), mode === 'ai' ? t('nameBot') : t('nameOpponent')];
    setUi({ scores: [0,0], cur: 1, over: false, aiOn: false, mode, size, names: playerNames });
    setScreen('game');
  }, []);

  // Return to menu
  const goMenu = useCallback(() => {
    stopNoise();
    const { roomCode } = online;
    if (roomCode) { ws.send('dotbox_leave', { code: roomCode }); }
    ws.cancelPending();
    setOnline({ roomCode: null, side: 0, connecting: false });
    setMenuStep('main');
    setScreen('menu');
  }, [online]);

  // AI turn
  const runAI = useCallback(() => {
    const g = G.current;
    if (g.over || !g.aiOn) return;
    const delay = ({ easy: 320, medium: 480, hard: 700 }[g.diff] ?? 400) + Math.random() * 200;
    setTimeout(() => {
      if (G.current !== g) return; // game was reset
      g.aiOn = false;
      if (g.over) { sync(); return; }
      const m = pickAI(g);
      if (!m) { sync(); return; }
      const { done } = makeMove(g, m.t, m.r, m.c);
      playSnap();
      if (done > 0) setTimeout(() => playBoxDing(2), 90);
      sync();
      if (g.over) { setTimeout(() => { playLose(); setScreen('result'); }, 700); return; }
      if (!g.over && g.cur === 2) { g.aiOn = true; sync(); runAI(); }
    }, delay);
  }, [sync]);

  // Handle a move (local, bot-response, or incoming online)
  const doMove = useCallback((type, row, col, fromOpponent = false) => {
    const g = G.current;
    const { side } = online;
    if (g.over) return;
    if (g.mode === 'online' && !fromOpponent && g.cur !== side) return;

    const prevCount = g.moveCount;
    let result;
    if (fromOpponent) {
      result = applyOpponentMove(g, type, row, col);
    } else {
      result = makeMove(g, type, row, col);
    }
    if (!result.ok) return;

    playSnap();
    if (result.done > 0) setTimeout(() => playBoxDing(g.cur === side || g.mode !== 'online' ? 1 : 2), 90);

    // Relay move if online and it was ours
    if (g.mode === 'online' && !fromOpponent && g.moveCount > prevCount) {
      ws.send('dotbox_move', { code: online.roomCode, t: type, r: row, c: col });
    }

    sync();

    if (g.over) {
      const myIdx = side > 0 ? side - 1 : 0;
      const iWin = g.mode !== 'online' ? g.scores[0] >= g.scores[1] : g.scores[myIdx] > g.scores[1 - myIdx];
      setTimeout(() => { iWin ? playWin() : playLose(); setScreen('result'); }, 700);
      return;
    }

    if (!fromOpponent && g.mode === 'ai' && g.cur === 2 && !g.over) {
      g.aiOn = true; sync(); runAI();
    }
  }, [online, sync, runAI]);

  // Surrender / forfeit the current game. The local player loses; in online
  // mode we also tell the server we left so the opponent is awarded the win.
  const handleSurrender = useCallback(() => {
    const g = G.current;
    if (g.over) return;
    g.aiOn = false;
    g.over = true;
    g.forfeit = true;
    if (g.mode === 'online' && online.roomCode) {
      ws.send('dotbox_leave', { code: online.roomCode });
    }
    sync();
    setTimeout(() => { playLose(); setScreen('result'); }, 300);
  }, [online, sync]);

  // Undo
  const handleUndo = useCallback(() => {
    const g = G.current;
    if (g.mode === 'online') return;
    const count = g.mode === 'ai' && g.history.length >= 2 ? 2 : 1;
    undoMove(g, count);
    sync();
  }, [sync]);

  // WebSocket events
  useEffect(() => {
    const onMatch = payload => {
      const { code, size, side, opponent } = payload;
      const oppName = opponent?.name || t('nameOpponent');
      setOnline(prev => ({ ...prev, roomCode: code, side, connecting: false }));
      const names = side === 1 ? [meName(), oppName] : [oppName, meName()];
      launch(size, 'online', 'easy', names);
    };
    const onOppMove = payload => {
      doMove(payload.t, payload.r, payload.c, true);
    };
    const onRoomCreated = payload => {
      setOnline(prev => ({ ...prev, roomCode: payload.code, connecting: false }));
      setMenuStep('friend-wait');
    };
    const onOppLeft = () => {
      const g = G.current;
      if (g.mode !== 'online') return;
      g.over = true;
      const s = online.side;
      if (s) g.scores[s - 1] = Math.max(g.scores[s - 1], g.scores[2 - s] + 1);
      sync();
      setTimeout(() => { playWin(); setScreen('result'); }, 400);
    };
    const onErr = payload => {
      setOnline(prev => ({ ...prev, connecting: false }));
      console.warn('DotBox WS error:', payload?.message);
    };

    ws.on('dotbox_match_found', onMatch);
    ws.on('dotbox_move', onOppMove);
    ws.on('dotbox_room_created', onRoomCreated);
    ws.on('dotbox_opponent_left', onOppLeft);
    ws.on('dotbox_error', onErr);
    return () => {
      ws.off('dotbox_match_found', onMatch);
      ws.off('dotbox_move', onOppMove);
      ws.off('dotbox_room_created', onRoomCreated);
      ws.off('dotbox_opponent_left', onOppLeft);
      ws.off('dotbox_error', onErr);
    };
  }, [online.side, online.roomCode, launch, doMove, sync]);

  // Telegram BackButton — show whenever we are not on the main menu.
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg?.BackButton) return;
      const show = screen !== 'menu' || menuStep !== 'main';
      show ? tg.BackButton.show() : tg.BackButton.hide();
    } catch {}
  }, [screen, menuStep]);

  // Telegram BackButton click — must mirror the on-screen back arrows exactly,
  // walking exactly ONE level up the navigation hierarchy (never skipping a
  // level). Matchmaking / room-wait steps also clean up their queue/room.
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg?.BackButton) return;
      // Parent of each menu sub-step (one level up). Steps not listed here
      // fall back to 'main'.
      const PARENT = {
        'online-size': 'main',
        'friend': 'main',
        'diff': 'main',
        'bot-settings': 'diff',
        'size': 'main',
      };
      const fn = () => {
        // In a live game or on the result screen, back returns to the menu.
        if (screen === 'game' || screen === 'result') { goMenu(); return; }
        // Matchmaking: leave the queue before going back.
        if (menuStep === 'online-mm') {
          ws.send('dotbox_cancel_queue', {}); ws.cancelPending();
          setOnline(p => ({ ...p, connecting: false }));
          setMenuStep('main');
          return;
        }
        // Waiting for a friend: tear down the created room before going back.
        if (menuStep === 'friend-wait') {
          if (online.roomCode) ws.send('dotbox_leave', { code: online.roomCode });
          setOnline(p => ({ ...p, roomCode: null }));
          setMenuStep('main');
          return;
        }
        // Otherwise step exactly one level up the hierarchy.
        setMenuStep(PARENT[menuStep] || 'main');
      };
      tg.BackButton.onClick(fn);
      return () => tg.BackButton.offClick(fn);
    } catch {}
  }, [screen, menuStep, goMenu, online.roomCode]);

  // Unlock audio on first touch
  useEffect(() => {
    const fn = () => { unlockAudio(); preloadMemes(); };
    window.addEventListener('pointerdown', fn, { once: true });
    return () => window.removeEventListener('pointerdown', fn);
  }, []);

  // Presence: open the WebSocket as soon as DotBox loads (not only when an
  // online game starts) so the WrongWay server marks the user online while
  // they are inside DotBox. The server registers presence on `auth`, which
  // needs the parent-injected initData — wait for it, then connect.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const tryConnect = () => {
      if (cancelled) return;
      if (window.__dbInitData) { ws.connect(); return; }
      if (tries++ < 25) setTimeout(tryConnect, 200);
    };
    tryConnect();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={styles.app}>
      <Background />

      {screen === 'menu' && (
        <MenuScreen
          step={menuStep}
          onStep={setMenuStep}
          online={online}
          onStartLocal={size => launch(size, 'local', 'easy', [meName(), t('nameFriend')])}
          onStartBot={(size, diff, opts) => launch(size, 'ai', diff, [meName(), `${t('nameBot')} (${t('diff'+diff.charAt(0).toUpperCase()+diff.slice(1))})`], opts)}
          onJoinOnline={size => {
            setOnline(p => ({ ...p, connecting: true }));
            setMenuStep('online-mm');
            ws.connect(() => { ws.send('dotbox_join_queue', { size }); setOnline(p => ({ ...p, connecting: false })); });
          }}
          onCancelOnline={() => {
            ws.send('dotbox_cancel_queue', {}); ws.cancelPending();
            setOnline(p => ({ ...p, connecting: false }));
            setMenuStep('main');
          }}
          onCreateRoom={size => {
            setOnline(p => ({ ...p, connecting: true }));
            ws.connect(() => { ws.send('dotbox_create_room', { size }); setOnline(p => ({ ...p, connecting: false })); });
          }}
          onJoinRoom={code => ws.connect(() => ws.send('dotbox_join_room', { code }))}
          onCancelRoom={() => {
            if (online.roomCode) ws.send('dotbox_leave', { code: online.roomCode });
            setOnline(p => ({ ...p, roomCode: null }));
            setMenuStep('main');
          }}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          G={G}
          ui={ui}
          online={online}
          onMove={doMove}
          onUndo={handleUndo}
          onBack={goMenu}
          onSurrender={handleSurrender}
          sync={sync}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          G={G}
          ui={ui}
          online={online}
          onPlayAgain={() => {
            const g = G.current;
            if (g.mode === 'online') { goMenu(); return; }
            launch(g.size, g.mode, g.diff, ui.names);
          }}
          onMenu={goMenu}
        />
      )}
    </div>
  );
}
