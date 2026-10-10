import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@pool/shared';
import { isLegalCueBallPlacement } from '@pool/shared';
import { RoomManager, type PlayerAccount } from '../rooms/RoomManager';
import { validatePlayerName, validateRoomCodeInput, validateShotRequest } from '../validation/validators';
import { finalizeRankedMatch } from '../ranking/matchResult';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Maps socket.id -> { roomCode, playerId } for quick lookup on disconnect.
const socketSessions = new Map<string, { roomCode: string; playerId: string }>();

/** Account attached to a socket by the auth middleware, when the player is signed in. */
function accountOf(socket: TypedSocket): PlayerAccount | null {
  const user = (socket.data as { user?: PlayerAccount }).user;
  return user ?? null;
}

export function registerSocketHandlers(io: TypedServer, roomManager: RoomManager): void {
  io.on('connection', (socket: TypedSocket) => {
    socket.on('create_room', (payload, ack) => {
      const account = accountOf(socket);
      // Signed-in players play under their account name; guests use the typed name.
      const playerName = account?.displayName ?? payload?.playerName;
      const nameCheck = validatePlayerName(playerName);
      if (!nameCheck.valid) {
        return ack({ ok: false, error: { code: 'INVALID_ROOM_CODE', message: nameCheck.reason! } });
      }

      const { room, playerId } = roomManager.createRoom(playerName, socket.id, account);
      socket.join(room.code);
      socketSessions.set(socket.id, { roomCode: room.code, playerId });

      ack({ ok: true, roomCode: room.code, playerId });
      io.to(room.code).emit('room_state', { ...room.state, roomCode: room.code });
    });

    socket.on('join_room', (payload, ack) => {
      const account = accountOf(socket);
      const playerName = account?.displayName ?? payload?.playerName;
      const codeCheck = validateRoomCodeInput(payload?.roomCode);
      const nameCheck = validatePlayerName(playerName);
      if (!codeCheck.valid) {
        return ack({ ok: false, error: { code: 'INVALID_ROOM_CODE', message: codeCheck.reason! } });
      }
      if (!nameCheck.valid) {
        return ack({ ok: false, error: { code: 'INVALID_ROOM_CODE', message: nameCheck.reason! } });
      }

      const result = roomManager.joinRoom(payload.roomCode, playerName, socket.id, account);
      if ('error' in result) {
        const message = result.error === 'ROOM_NOT_FOUND' ? 'Esse código de sala não existe.' : 'Essa sala já está cheia.';
        return ack({ ok: false, error: { code: result.error, message } });
      }

      const { room, playerId } = result;
      socket.join(room.code);
      socketSessions.set(socket.id, { roomCode: room.code, playerId });

      ack({ ok: true, playerId, state: room.state });
      io.to(room.code).emit('room_state', { ...room.state, roomCode: room.code });
      socket.to(room.code).emit('opponent_status', { connected: true, reconnecting: false });
    });

    socket.on('rejoin_room', (payload, ack) => {
      const room = roomManager.getRoom(payload?.roomCode ?? '');
      if (!room) {
        return ack({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'Essa sala não existe mais.' } });
      }
      const slot = room.getPlayerSlot(payload.playerId);
      if (!slot) {
        return ack({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'Você não faz parte dessa sala.' } });
      }

      room.markReconnected(payload.playerId, socket.id);
      socket.join(room.code);
      socketSessions.set(socket.id, { roomCode: room.code, playerId: payload.playerId });

      ack({ ok: true, playerId: payload.playerId, state: room.state });
      socket.to(room.code).emit('opponent_status', { connected: true, reconnecting: false });
      io.to(room.code).emit('room_state', { ...room.state, roomCode: room.code });
    });

    socket.on('take_shot', (payload, ack) => {
      const session = socketSessions.get(socket.id);
      if (!session || session.roomCode !== payload?.roomCode) {
        return ack({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'Você não está nessa sala.' } });
      }
      const room = roomManager.getRoom(session.roomCode);
      if (!room) {
        return ack({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'A sala não existe mais.' } });
      }
      if (!room.isFull() || room.state.phase === 'game_over') {
        return ack({ ok: false, error: { code: 'MATCH_NOT_ACTIVE', message: 'A partida não está ativa.' } });
      }
      if (!room.isPlayersTurn(session.playerId)) {
        return ack({ ok: false, error: { code: 'NOT_YOUR_TURN', message: 'Não é a sua vez.' } });
      }
      const shotCheck = validateShotRequest(payload.shot);
      if (!shotCheck.valid) {
        return ack({ ok: false, error: { code: 'INVALID_SHOT', message: shotCheck.reason! } });
      }

      // Ball-in-hand: never trust a client-supplied position. Validate it
      // server-side against the actual current ball positions (and the
      // WPA break-foul head-string restriction, when applicable) before
      // accepting the shot at all.
      if (room.state.ballInHand) {
        if (!payload.shot.cueBallPlacement) {
          return ack({ ok: false, error: { code: 'INVALID_PLACEMENT', message: 'Bola na mão exige o posicionamento da bola branca.' } });
        }
        const restricted = room.isBallInHandRestrictedToHeadString();
        const legal = isLegalCueBallPlacement(payload.shot.cueBallPlacement, room.state.balls, {
          restrictToHeadStringArea: restricted,
        });
        if (!legal) {
          return ack({
            ok: false,
            error: {
              code: 'INVALID_PLACEMENT',
              message: restricted
                ? 'Posicionamento inválido: deve ficar atrás da linha de saída após uma falta na tacada inicial.'
                : 'Posicionamento inválido: deve estar sobre a mesa e não sobrepor outra bola.',
            },
          });
        }
      }

      // Phase 1: apply placement/velocity and broadcast shot_started so both
      // clients can begin an identical local physics replay immediately —
      // well before the server's own simulation (run synchronously below)
      // finishes and produces the authoritative result.
      const { shotId, preShotBalls, isBreakShot } = room.beginShot(session.playerId, payload.shot);
      ack({ ok: true });
      io.to(room.code).emit('shot_started', {
        roomCode: room.code,
        shotId,
        preShotBalls,
        shot: payload.shot,
        shooterId: session.playerId,
        isBreakShot,
      });

      // Phase 2: resolve authoritatively and broadcast the final result.
      const { result: resolvedResult } = room.resolveShot();
      io.to(room.code).emit('shot_applied', { ...room.state, roomCode: room.code, shotId });

      // A match just ended — award ranking points when both players are signed in.
      if (resolvedResult.gameWinnerId) {
        void finalizeRankedMatch(io, room);
      }
    });

    socket.on('request_rematch', (payload) => {
      const session = socketSessions.get(socket.id);
      if (!session || session.roomCode !== payload?.roomCode) return;
      const room = roomManager.getRoom(session.roomCode);
      if (!room) return;

      room.rematchVotes.add(session.playerId);
      io.to(room.code).emit('rematch_requested', { byPlayerId: session.playerId });

      const bothIds = room.players.map((p) => p.info.id).filter(Boolean);
      if (bothIds.every((id) => room.rematchVotes.has(id))) {
        room.resetForRematch();
        io.to(room.code).emit('rematch_started', room.state);
      }
    });

    socket.on('leave_room', (payload) => {
      const room = roomManager.getRoom(payload?.roomCode ?? '');
      const session = socketSessions.get(socket.id);
      if (room && session) {
        handleDeparture(io, roomManager, room.code, session.playerId, socket.id);
      }
      socketSessions.delete(socket.id);
    });

    socket.on('disconnect', () => {
      const session = socketSessions.get(socket.id);
      if (!session) return;
      handleDeparture(io, roomManager, session.roomCode, session.playerId, socket.id);
      socketSessions.delete(socket.id);
    });
  });
}

function handleDeparture(
  io: TypedServer,
  roomManager: RoomManager,
  roomCode: string,
  playerId: string,
  socketId: string
): void {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;

  io.to(room.code).emit('opponent_status', { connected: false, reconnecting: true });

  room.markDisconnected(playerId, () => {
    // Grace period expired with no reconnect: tear the room down.
    io.to(room.code).emit('error_message', {
      code: 'MATCH_NOT_ACTIVE',
      message: 'O oponente não reconectou a tempo. A partida foi encerrada.',
    });
    roomManager.removeRoom(room.code);
  });

  void socketId;
}
