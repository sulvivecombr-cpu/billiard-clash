import { generateRoomCode, type PlayerInfo } from '@pool/shared';
import { randomUUID } from 'crypto';
import { Room } from './Room';

/** Signed-in player identity attached to a socket connection. */
export interface PlayerAccount {
  id: string;
  displayName: string;
  rating: number;
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(
    hostName: string,
    hostSocketId: string,
    account: PlayerAccount | null = null
  ): { room: Room; playerId: string } {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();

    const playerId = randomUUID();
    const hostPlayer: PlayerInfo = {
      id: playerId,
      name: hostName.slice(0, 24),
      group: null,
      connected: true,
      rating: account?.rating ?? null,
    };
    const room = new Room(code, hostPlayer, hostSocketId, account?.id ?? null);
    this.rooms.set(code, room);
    return { room, playerId };
  }

  joinRoom(
    code: string,
    guestName: string,
    guestSocketId: string,
    account: PlayerAccount | null = null
  ): { room: Room; playerId: string } | { error: 'ROOM_NOT_FOUND' | 'ROOM_FULL' } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { error: 'ROOM_NOT_FOUND' };
    if (room.isFull()) return { error: 'ROOM_FULL' };

    const playerId = randomUUID();
    const guestPlayer: PlayerInfo = {
      id: playerId,
      name: guestName.slice(0, 24),
      group: null,
      connected: true,
      rating: account?.rating ?? null,
    };
    room.addSecondPlayer(guestPlayer, guestSocketId, account?.id ?? null);
    return { room, playerId };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  removeRoom(code: string): void {
    this.rooms.delete(code.toUpperCase());
  }

  findRoomBySocket(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.socketId === socketId)) return room;
    }
    return undefined;
  }
}
