import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@pool/shared';
import { STARTING_RATING } from '@pool/shared';
import type { Room } from '../rooms/Room';
import { applyMatchResult } from './rating';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Awards ranking points once a match ends, when BOTH players are signed in
 * (guests play unranked). Updates the live room players' ratings and
 * re-broadcasts the room state so both clients show the new numbers.
 * Safe to call more than once — the room flags the result as recorded.
 */
export async function finalizeRankedMatch(io: TypedServer, room: Room): Promise<void> {
  if (room.resultRecorded || !room.state.winnerId) return;

  const winnerSlot = room.players.find((p) => p.info.id === room.state.winnerId);
  const loserSlot = room.players.find((p) => p.info.id !== room.state.winnerId);
  if (!winnerSlot || !loserSlot) return;
  if (!winnerSlot.userId || !loserSlot.userId) return; // guest match → unranked

  room.resultRecorded = true;

  try {
    const ratings = await applyMatchResult(
      { userId: winnerSlot.userId, rating: winnerSlot.info.rating ?? STARTING_RATING },
      { userId: loserSlot.userId, rating: loserSlot.info.rating ?? STARTING_RATING }
    );
    winnerSlot.info.rating = ratings.winner;
    loserSlot.info.rating = ratings.loser;
    io.to(room.code).emit('room_state', { ...room.state, roomCode: room.code });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('ranking update failed', err);
    room.resultRecorded = false; // allow a retry on the next resolution
  }
}
