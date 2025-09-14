import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { GameRoom } from '../game/interfaces';

@Injectable()
export class RoomService {
  private rooms: Map<string, GameRoom> = new Map();
  private defaultRoomId: string;

  constructor() {
    // Créer une room par défaut
    this.defaultRoomId = this.createRoom('Monde Principal', 50);
  }

  createRoom(name: string, maxPlayers: number = 20): string {
    const roomId = uuidv4();
    const room: GameRoom = {
      id: roomId,
      name,
      maxPlayers,
      players: new Map(),
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    return roomId;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  getDefaultRoom(): GameRoom | undefined {
    return this.rooms.get(this.defaultRoomId);
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  addPlayerToRoom(roomId: string, playerId: string, playerData: any): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.size >= room.maxPlayers) {
      return false;
    }

    room.players.set(playerId, playerData);
    return true;
  }
}
