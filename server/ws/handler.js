import { verifyTelegramWebAppData } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { roomManager } from './rooms.js';
import { matchmaking } from './matchmaking.js';
import { QuoridorEngine } from '../game/quoridor.js';
import { presence } from './presence.js';
import { socketRegistry } from './sockets.js';
import { getClientIp, lookupCountry } from './geoip.js';

// Send active online count to everyone
function broadcastOnlineCount(wss) {
  const count = wss.clients.size;
  const message = JSON.stringify({ type: 'users_count', payload: { count } });
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// Get lists of all open lobbies
function getOpenLobbies() {
  return Object.values(roomManager.rooms)
    .filter(room => !room.isPrivate && !room.isStarted && room.players.length === 1)
    .map(room => ({
      id: room.roomCode,
      boardSize: room.config.boardSize,
      totalTime: room.config.totalTime,
      wallsCount: room.config.wallsCount,
      player: {
        first_name: room.players[0].first_name
      }
    }));
}

export function handleWebSocketConnection(ws, wss, request) {
  console.log('New WebSocket connection established.');
  
  // Track user profile on the socket object
  let userProfile = null;

  // Client IP for geolocation (resolved to a country on auth)
  const clientIp = request ? getClientIp(request) : '';
  
  // Send active count on new connection
  broadcastOnlineCount(wss);

  ws.on('message', (messageStr) => {
    try {
      const message = JSON.parse(messageStr);
      const { type, payload } = message;
      
      // 0. Heartbeat ping
      if (type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      // 1. Authentication
      if (type === 'auth') {
        const BOT_TOKEN = process.env.BOT_TOKEN;
        const authResult = verifyTelegramWebAppData(payload.initData, BOT_TOKEN);

        if (!authResult.isValid) {
          console.log(`Auth failed: ${authResult.reason}`);
          ws.send(JSON.stringify({ type: 'auth_failed', payload: { reason: authResult.reason } }));
          ws.close(4003, 'Auth failed');
          return;
        }

        userProfile = authResult.user;
        console.log(`Auth success for user: ${userProfile.first_name} (ID: ${userProfile.id})`);

        // Do NOT create a user here — only the bot's /start registers accounts.
        // If the user already exists (started the bot), update their last_seen/info.
        const known = db.touchUser(userProfile.id, userProfile);

        // Mark user online (for live admin presence)
        presence.add(userProfile.id);
        // Register this socket so we can push friend/invite notifications.
        socketRegistry.add(userProfile.id, ws);

        // Resolve real country from IP — but only persist it for known users
        if (known) {
          lookupCountry(clientIp).then(geo => {
            if (geo && geo.code) {
              db.setUserCountry(userProfile.id, geo.code, geo.country);
            }
          }).catch(() => {});
        }

        // check if user has an active room to reconnect to!
        const existingRoom = roomManager.getRoomByPlayerId(userProfile.id);
        if (existingRoom && !existingRoom.isFinished) {
          console.log(`User reconnecting to active room: ${existingRoom.roomCode}`);
          
          // Bind new socket to room profile
          const pProfile = {
            id: userProfile.id,
            first_name: userProfile.first_name,
            username: userProfile.username,
            ws
          };
          existingRoom.handleReconnect(pProfile);
        }

        ws.send(JSON.stringify({ type: 'auth_success', payload: { user: userProfile } }));
        return;
      }

      // Must be authenticated to run subsequent messages
      if (!userProfile) {
        console.warn('Unauthenticated message received, closing socket.');
        ws.close(4001, 'Unauthenticated');
        return;
      }

      // 1b. Set display name (username for the leaderboard)
      if (type === 'set_username') {
        const raw = (payload && payload.name != null) ? String(payload.name) : '';
        const name = raw.trim().slice(0, 20);
        if (!name) {
          ws.send(JSON.stringify({ type: 'username_set', payload: { ok: false, error: 'empty' } }));
          return;
        }
        const updated = db.setDisplayName(userProfile.id, name);
        if (updated) {
          ws.send(JSON.stringify({ type: 'username_set', payload: { ok: true, name } }));
        } else {
          // User not registered yet (hasn't pressed /start in the bot)
          ws.send(JSON.stringify({ type: 'username_set', payload: { ok: false, error: 'not_registered' } }));
        }
        return;
      }

      // 1c. Leaderboard request (includes the requester's own rank)
      if (type === 'get_leaderboard') {
        const board = db.getLeaderboard(20, userProfile.id);
        ws.send(JSON.stringify({ type: 'leaderboard', payload: board }));
        return;
      }

      // ===== Friend system =====
      const pushFriendData = (uid) => {
        const data = db.getFriendData(uid, presence.onlineIds());
        socketRegistry.sendToUser(uid, 'friend_data', data);
      };

      // Get my friends + pending requests
      if (type === 'get_friends') {
        const data = db.getFriendData(userProfile.id, presence.onlineIds());
        ws.send(JSON.stringify({ type: 'friend_data', payload: data }));
        return;
      }

      // Send a friend request to another user
      if (type === 'send_friend_request') {
        const targetId = payload && payload.userId;
        if (!targetId) return;
        const res = db.sendFriendRequest(userProfile.id, targetId);
        ws.send(JSON.stringify({ type: 'friend_request_result', payload: { ...res, targetId } }));
        if (res.ok) {
          // Refresh both users' friend panels
          pushFriendData(userProfile.id);
          pushFriendData(targetId);
          // Notify the target of a new incoming request (if just sent)
          if (res.status === 'sent') {
            socketRegistry.sendToUser(targetId, 'friend_request_received', {
              from: db.publicProfile(userProfile.id)
            });
          }
        }
        return;
      }

      // Accept an incoming friend request
      if (type === 'accept_friend_request') {
        const otherId = payload && payload.userId;
        if (!otherId) return;
        const res = db.acceptFriendRequest(userProfile.id, otherId);
        if (res.ok) {
          pushFriendData(userProfile.id);
          pushFriendData(otherId);
          socketRegistry.sendToUser(otherId, 'friend_request_accepted', {
            by: db.publicProfile(userProfile.id)
          });
        }
        return;
      }

      // Decline an incoming friend request
      if (type === 'decline_friend_request') {
        const otherId = payload && payload.userId;
        if (!otherId) return;
        db.declineFriendRequest(userProfile.id, otherId);
        pushFriendData(userProfile.id);
        pushFriendData(otherId);
        return;
      }

      // Remove an existing friend
      if (type === 'remove_friend') {
        const otherId = payload && payload.userId;
        if (!otherId) return;
        db.removeFriend(userProfile.id, otherId);
        pushFriendData(userProfile.id);
        pushFriendData(otherId);
        return;
      }

      // ===== Game invite (challenge a friend to play) =====
      if (type === 'invite_to_game') {
        const targetId = payload && payload.userId;
        if (!targetId) return;
        if (!socketRegistry.isOnline(targetId)) {
          ws.send(JSON.stringify({ type: 'invite_result', payload: { ok: false, error: 'offline', targetId } }));
          return;
        }
        // Create a private room and tell the inviter to wait in it.
        const cfg = payload.config || { mode: 'duel', boardSize: 9, totalTime: 300, blitzTime: 0, wallsCount: 10 };
        const room = roomManager.createRoom({ ...cfg, isPrivate: true });
        const inviter = { id: userProfile.id, first_name: userProfile.first_name, username: userProfile.username, ws };
        room.addPlayer(inviter);

        ws.send(JSON.stringify({ type: 'invite_result', payload: { ok: true, targetId, roomCode: room.roomCode } }));
        socketRegistry.sendToUser(targetId, 'game_invite_received', {
          from: db.publicProfile(userProfile.id),
          roomCode: room.roomCode,
          config: room.config
        });
        return;
      }

      // Friend accepts a game invite -> join the room and start.
      if (type === 'accept_game_invite') {
        const roomCode = payload && payload.roomCode;
        const room = roomManager.getRoom(roomCode);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: "Xona topilmadi yoki bekor qilindi!" } }));
          return;
        }
        if (room.players.length >= 2) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: "Xona to'la!" } }));
          return;
        }
        const player = { id: userProfile.id, first_name: userProfile.first_name, username: userProfile.username, ws };
        room.addPlayer(player);
        room.start();
        return;
      }

      // Friend declines a game invite -> tidy up the room, notify inviter.
      if (type === 'decline_game_invite') {
        const roomCode = payload && payload.roomCode;
        const room = roomManager.getRoom(roomCode);
        if (room && !room.isStarted) {
          const inviter = room.players[0];
          if (inviter) {
            socketRegistry.sendToUser(inviter.id, 'game_invite_declined', {
              by: db.publicProfile(userProfile.id)
            });
          }
          roomManager.deleteRoom(roomCode);
        }
        return;
      }

      // ===== In-game real-time chat =====
      if (type === 'game_chat') {
        const roomCode = payload && payload.roomCode;
        const text = payload && typeof payload.text === 'string' ? payload.text.trim().slice(0, 200) : '';
        if (!roomCode || !text) return;
        const room = roomManager.getRoom(roomCode);
        if (!room) return;
        const opp = room.getOpponent(userProfile.id);
        if (opp) {
          room.sendTo(opp.id, 'game_chat', {
            text,
            from: userProfile.first_name || 'Player',
            ts: Date.now()
          });
        }
        return;
      }

      // 2. Matchmaking
      if (type === 'enter_matchmaking') {
        const player = { id: userProfile.id, first_name: userProfile.first_name, username: userProfile.username, ws };
        matchmaking.enter(player, payload);
        return;
      }

      if (type === 'cancel_search') {
        matchmaking.leave(userProfile.id);

        // Also clean up any open (not-yet-started) public lobby this user created
        const openRoom = roomManager.getRoomByPlayerId(userProfile.id);
        if (openRoom && !openRoom.isStarted) {
          roomManager.deleteRoom(openRoom.roomCode);
          // Broadcast updated lobbies list to everyone online
          wss.clients.forEach(client => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({ type: 'lobbies_list', payload: getOpenLobbies() }));
            }
          });
        }
        return;
      }

      // 3. Lobby List
      if (type === 'get_lobbies') {
        ws.send(JSON.stringify({ type: 'lobbies_list', payload: getOpenLobbies() }));
        return;
      }

      // 4. Create Public Lobby
      if (type === 'create_public_lobby') {
        const player = { id: userProfile.id, first_name: userProfile.first_name, username: userProfile.username, ws };
        const room = roomManager.createRoom({ ...payload, isPrivate: false });
        room.addPlayer(player);
        
        ws.send(JSON.stringify({ type: 'lobby_created', payload: { success: true } }));
        
        // Broadcast new lobbies list to everyone online
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ type: 'lobbies_list', payload: getOpenLobbies() }));
          }
        });
        return;
      }

      // 5. Create Private Room
      if (type === 'create_private_room') {
        const player = { id: userProfile.id, first_name: userProfile.first_name, username: userProfile.username, ws };
        const room = roomManager.createRoom({ ...payload, isPrivate: true });
        room.addPlayer(player);
        
        ws.send(JSON.stringify({ type: 'room_created', payload: { roomCode: room.roomCode } }));
        return;
      }

      // 6. Join Private Room
      if (type === 'join_private_room') {
        const room = roomManager.getRoom(payload.roomCode);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: "Xona topilmadi!" } }));
          return;
        }
        if (room.players.length >= 2) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: "Xona to'la!" } }));
          return;
        }

        const player = { id: userProfile.id, first_name: userProfile.first_name, username: userProfile.username, ws };
        room.addPlayer(player);
        room.start();
        return;
      }

      // 7. Join Public Lobby
      if (type === 'join_lobby') {
        const room = roomManager.getRoom(payload.lobbyId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', payload: { message: "Lobby topilmadi!" } }));
          return;
        }

        const player = { id: userProfile.id, first_name: userProfile.first_name, username: userProfile.username, ws };
        room.addPlayer(player);
        room.start();

        // Broadcast lobbies update
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ type: 'lobbies_list', payload: getOpenLobbies() }));
          }
        });
        return;
      }

      // 7b. Leave a private room before the match starts (creator cancels)
      if (type === 'leave_private_room') {
        const pendingRoom = roomManager.getRoom(payload.roomCode);
        if (pendingRoom && !pendingRoom.isStarted) {
          roomManager.deleteRoom(pendingRoom.roomCode);
        }
        return;
      }

      // 8. Gameplay Actions
      const room = roomManager.getRoom(payload.roomCode);
      if (!room) return;

      if (type === 'game_move') {
        room.handleMove(userProfile.id, payload.r, payload.c);
        return;
      }

      if (type === 'game_wall') {
        room.handleWall(userProfile.id, payload.r, payload.c, payload.wallType);
        return;
      }

      if (type === 'game_emoji') {
        const opp = room.getOpponent(userProfile.id);
        if (opp) {
          room.sendTo(opp.id, 'game_emoji', { emoji: payload.emoji });
        }
        return;
      }

      if (type === 'surrender') {
        const side = room.playerSides[userProfile.id];
        room.finish(1 - side);
        const opp = room.getOpponent(userProfile.id);
        if (opp) {
          room.sendTo(opp.id, 'opponent_resigned', null);
        }
        return;
      }

      // 9. Rematches
      if (type === 'request_rematch') {
        room.rematchRequests.add(userProfile.id);
        const opp = room.getOpponent(userProfile.id);
        if (opp) {
          room.sendTo(opp.id, 'opponent_requested_rematch', null);
        }
        return;
      }

      if (type === 'accept_rematch') {
        // Double check both sides requested
        room.rematchRequests.add(userProfile.id);
        
        if (room.rematchRequests.size === 2) {
          console.log(`Rematch accepted! Swapping sides for room: ${room.roomCode}`);
          
          // Swap sides for fairness
          const keys = Object.keys(room.playerSides);
          const old0 = room.playerSides[keys[0]];
          room.playerSides[keys[0]] = 1 - old0;
          room.playerSides[keys[1]] = old0;

          // Re-initialize engine
          room.engine = new QuoridorEngine(room.config.boardSize, room.config.wallsCount, room.config.mode);
          room.rematchRequests.clear();
          room.isFinished = false;

          // Send to both players
          room.players.forEach(p => {
            room.sendTo(p.id, 'rematch_accepted', {
              roomCode: room.roomCode,
              side: room.playerSides[p.id]
            });
          });
        }
        return;
      }

      if (type === 'leave_room') {
        const opp = room.getOpponent(userProfile.id);
        if (opp) {
          room.sendTo(opp.id, 'opponent_left', null);
        }
        room.removePlayer(userProfile.id);
        if (room.players.length === 0) {
          roomManager.deleteRoom(room.roomCode);
        }
        return;
      }

    } catch (err) {
      console.error('Error handling WebSocket message', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed.');
    
    if (userProfile) {
      // 0. Mark offline
      presence.remove(userProfile.id);
      socketRegistry.remove(userProfile.id, ws);

      // 1. Remove from matchmaking queue
      matchmaking.leave(userProfile.id);
      
      // 2. Alert active game rooms of disconnection
      const room = roomManager.getRoomByPlayerId(userProfile.id);
      if (room && !room.isFinished) {
        room.handleDisconnect(userProfile.id);
      }
    }
    
    broadcastOnlineCount(wss);
  });
}
