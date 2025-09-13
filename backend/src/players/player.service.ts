import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PlayerData, PlayerPosition, PlayerRotation } from '../game/interfaces';

@Injectable()
export class PlayerService {
  private players: Map<string, PlayerData> = new Map();

  createPlayer(socketId: string, name: string): PlayerData {
    const player: PlayerData = {
      id: uuidv4(),
      name,
      position: { x: 0, y: 5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      isMoving: false,
      speed: 0,
      lastUpdate: Date.now(),
    };

    this.players.set(socketId, player);
    return player;
  }

  getPlayer(socketId: string): PlayerData | undefined {
    return this.players.get(socketId);
  }

  updatePlayerPosition(
    socketId: string,
    position: PlayerPosition,
    rotation: PlayerRotation,
    isMoving: boolean,
    speed: number,
  ): PlayerData | null {
    const player = this.players.get(socketId);
    if (!player) return null;

    player.position = position;
    player.rotation = rotation;
    player.isMoving = isMoving;
    player.speed = speed;
    player.lastUpdate = Date.now();

    return player;
  }

  removePlayer(socketId: string): PlayerData | null {
    const player = this.players.get(socketId);
    if (player) {
      this.players.delete(socketId);
    }
    return player || null;
  }

  getAllPlayers(): PlayerData[] {
    return Array.from(this.players.values());
  }

  getPlayersInRoom(roomId: string): PlayerData[] {
    // Pour l'instant, tous les joueurs sont dans la même "room"
    // Plus tard, on pourra implémenter des rooms séparées
    return this.getAllPlayers();
  }
}
