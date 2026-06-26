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
import styles from './App.module.css';

const ME = window.__dbMe || { name: 'Siz', username: '' };

export default function App() {
  const [screen, setScreen] = useState('menu');   // 'menu' | 'game' | 'result'
  const [menuStep, setMenuStep] = useState('main');

  // Mutable game object — updates don't cause re-renders (canvas draws directly)
  const G = useRef(createGame());

  // React UI state (drives scoreboard, turn bar, button states)
  const [ui, setUi] = useState({ scores: [0,0], cur: 1, over: false, aiOn: false, mode: 'local', size: 4, names: [ME.name, 'Raqib'] });

  // Online state
  const [online, setOnline] = useState({ roomCode: null, side: 0, connecting: false });

  // Sync UI from game ref
  const sync = useCallback(() => {
    const g = G.current;
    setUi(prev => ({ ...prev, scores: [...g.scores], cur: g.cur, over: g.over, aiOn: g.aiOn, size: g.size, mode: g.mode }));
  }, []);

  // Launch a game
  const launch = useCallback((size, mode, diff, names = null) => {
    const g = createGame(size, mode, diff);
    G.current = g;
    const playerNames = names || [ME.name, mode === 'ai' ? 'Bot' : 'Raqib'];
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
      const oppName = opponent?.name || 'Raqib';
      setOnline(prev => ({ ...prev, roomCode: code, side, connecting: false }));
      const names = side === 1 ? [ME.name, oppName] : [oppName, ME.name];
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

  // Telegram BackButton
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg?.BackButton) return;
      const show = screen !== 'menu' || menuStep !== 'main';
      show ? tg.BackButton.show() : tg.BackButton.hide();
    } catch {}
  }, [screen, menuStep]);

  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg?.BackButton) return;
      const fn = () => {
        if (screen === 'game' || screen === 'result') { goMenu(); return; }
        if (menuStep === 'online-mm') { ws.send('dotbox_cancel_queue',{}); ws.cancelPending(); setOnline(p=>({...p,connecting:false})); setMenuStep('main'); }
        else if (menuStep === 'friend-wait') { if (online.roomCode) ws.send('dotbox_leave',{code:online.roomCode}); setOnline(p=>({...p,roomCode:null})); setMenuStep('main'); }
        else setMenuStep('main');
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

  return (
    <div className={styles.app}>
      <Background />

      {screen === 'menu' && (
        <MenuScreen
          step={menuStep}
          onStep={setMenuStep}
          online={online}
          onStartLocal={size => launch(size, 'local', 'easy', [ME.name, "Do'st"])}
          onStartBot={(size, diff) => launch(size, 'ai', diff, [ME.name, `Bot (${diff})`])}
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
