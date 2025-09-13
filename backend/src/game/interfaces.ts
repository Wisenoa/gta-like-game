export interface PlayerPosition {
  x: number;
  y: number;
  z: number;
}

export interface PlayerRotation {
  x: number;
  y: number;
  z: number;
}

export interface PlayerData {
  id: string;
  name: string;
  position: PlayerPosition;
  rotation: PlayerRotation;
  isMoving: boolean;
  speed: number;
  lastUpdate: number;
}

export interface GameRoom {
  id: string;
  name: string;
  maxPlayers: number;
  players: Map<string, PlayerData>;
  createdAt: Date;
}

export interface JoinRoomDto {
  roomId: string;
  playerName: string;
}

export interface PlayerMoveDto {
  position: PlayerPosition;
  rotation: PlayerRotation;
  isMoving: boolean;
  speed: number;
}
