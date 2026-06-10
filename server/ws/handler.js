import { verifyTelegramWebAppData } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { roomManager } from './rooms.js';
import { matchmaking } from './matchmaking.js';
import { QuoridorEngine } from '../game/quoridor.js';
import { presence } from './presence.js';

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

export function handleWebSocketConnection(ws, wss) {
  console.log('New WebSocket connection established.');
  
  // Track user profile on the socket object
  let userProfile = null;
  
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
        
        // Save user to database (includes language_code -> country/flag)
        db.saveUser(userProfile.id, userProfile);

        // Mark user online
        presence.add(userProfile.id);

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
