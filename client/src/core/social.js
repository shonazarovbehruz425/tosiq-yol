// App-wide social notifications: friend requests and game invites.
// Bound once at startup so notifications appear on any screen.
import { socket } from './websocket.js';
import { Toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { haptic } from './telegram.js';
import { t } from './i18n.js';
import { router } from './router.js';

let installed = false;

export function initSocial() {
  if (installed) return;
  installed = true;

  // Someone sent me a friend request
  socket.on('friend_request_received', (data) => {
    const name = (data && data.from && data.from.name) || 'Player';
    haptic.notification('warning');
    Toast.info(t('friendRequestFrom', { name }));
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
}

export default initSocial;
