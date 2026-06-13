// App-wide social notifications: friend requests and game invites.
// Bound once at startup so notifications appear on any screen.
import { socket } from './websocket.js';
import { Toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { haptic } from './telegram.js';
import { t } from './i18n.js';
import { router } from './router.js';
import { CURRENCY } from '../game/currency.js';

let installed = false;

export function initSocial() {
  if (installed) return;
  installed = true;

  // Someone sent me a friend request -> show accept/decline prompt
  socket.on('friend_request_received', (data) => {
    if (!data || !data.from) return;
    const name = data.from.name || 'Player';
    const fromId = data.from.id;
    haptic.notification('warning');
    Modal.show({
      icon: '👋',
      title: t('addFriend'),
      message: t('friendRequestFrom', { name }),
      confirmText: t('accept'),
      cancelText: t('decline'),
      barrierDismissible: false,
      onConfirm: () => {
        if (fromId != null) socket.send('accept_friend_request', { userId: fromId });
        Toast.success(t('friendAdded'));
      },
      onCancel: () => {
        if (fromId != null) socket.send('decline_friend_request', { userId: fromId });
      }
    });
  });

  // Someone accepted my friend request
  socket.on('friend_request_accepted', (data) => {
    const name = (data && data.by && data.by.name) || 'Player';
    haptic.notification('success');
    Toast.success(t('friendAcceptedYou', { name }));
  });

  // A friend invited me to a game -> show accept/decline modal
  socket.on('game_invite_received', (data) => {
    if (!data || !data.roomCode) return;
    const name = (data.from && data.from.name) || 'Player';
    haptic.notification('warning');
    Modal.show({
      icon: '🎮',
      title: t('inviteToPlay'),
      message: t('gameInviteFrom', { name }),
      confirmText: t('accept'),
      cancelText: t('decline'),
      barrierDismissible: false,
      onConfirm: () => {
        socket.send('accept_game_invite', { roomCode: data.roomCode });
        // The server replies with match_found; route via a one-shot listener.
        const onMatch = (m) => {
          socket.off('match_found', onMatch);
          router.navigate('game', {
            vs: 'friend',
            roomCode: m.roomCode,
            playerSide: m.side,
            boardSize: m.config.boardSize,
            totalTime: m.config.totalTime,
            blitzTime: m.config.blitzTime,
            wallsCount: m.config.wallsCount,
            mode: m.config.mode,
            mySkin: m.mySkin,
            opponentSkin: m.opponent && m.opponent.skin,
            opponent: m.opponent
          });
        };
        socket.on('match_found', onMatch);
      },
      onCancel: () => {
        socket.send('decline_game_invite', { roomCode: data.roomCode });
      }
    });
  });

  // The friend I invited declined
  socket.on('game_invite_declined', (data) => {
    const name = (data && data.by && data.by.name) || 'Player';
    haptic.notification('error');
    Toast.warning(t('inviteDeclined', { name }));
  });

  // WAYZ awarded (e.g. after an online game)
  socket.on('coins_awarded', (data) => {
    const amount = data && data.amount;
    if (amount) Toast.success(`+${amount} ${CURRENCY.code}`);
  });

  // 2v2 Team match found -> drop into the online team game.
  socket.on('team_match_found', (data) => {
    if (!data || !data.roomCode) return;
    haptic.notification('success');
    router.navigate('team-game', {
      online: true,
      roomCode: data.roomCode,
      slot: data.slot,
      team: data.team,
      boardSize: data.config.boardSize,
      wallsPerTeam: data.config.wallsPerTeam,
      players: data.players
    });
  });
}

export default initSocial;
