import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PlayerData, PlayerPosition, PlayerRotation } from '../game/interfaces';
import { PlayerDatabaseService } from './player-database.service';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);
  private players: Map<string, PlayerData> = new Map();
  private lastSaveTime = Date.now();
  private readonly SAVE_INTERVAL = 5000; // 5 secondes

  constructor(private readonly playerDb: PlayerDatabaseService) {
    // Sauvegarder périodiquement les positions
    setInterval(() => {
      this.saveAllPlayerPositions();
    }, this.SAVE_INTERVAL);
  }

  async createPlayer(socketId: string, name: string): Promise<PlayerData> {
    try {
      // Vérifier si un joueur avec ce nom existe déjà
      const existingPlayer = await this.playerDb.getPlayerByName(name);
      
      this.logger.log(`🔍 Vérification du joueur ${name}:`, existingPlayer);
      
      if (existingPlayer) {
        // Vérifier si le joueur est vraiment connecté (présent dans le cache mémoire)
        const isPlayerInCache = Array.from(this.players.values()).some(p => p.name === name);
        
        // Si le joueur existe et est offline OU s'il n'est pas dans le cache mémoire, le reconnecter
        if (!existingPlayer.isOnline || !isPlayerInCache) {
          this.logger.log(`🔄 Reconnexion du joueur: ${name} (isOnline: ${existingPlayer.isOnline}, inCache: ${isPlayerInCache})`);
          
          // Mettre à jour le socketId et marquer comme online
          const updatedPlayer = await this.playerDb.createOrUpdatePlayer(
            socketId,
            name,
            existingPlayer.position,
            existingPlayer.rotation
          );

          // Créer l'objet PlayerData pour le cache mémoire
          const player: PlayerData = {
            id: updatedPlayer.id,
            name: updatedPlayer.name,
            position: updatedPlayer.position,
            rotation: updatedPlayer.rotation,
            isMoving: false,
            speed: 0,
            lastUpdate: Date.now(),
          };

          this.players.set(socketId, player);
          this.logger.log(`✅ Joueur reconnecté: ${name} (${socketId})`);
          return player;
        } else {
          // Le joueur est vraiment en ligne et dans le cache
          this.logger.error(`❌ Le joueur "${name}" est déjà connecté (isOnline: ${existingPlayer.isOnline}, inCache: ${isPlayerInCache})`);
          throw new Error(`Le joueur "${name}" est déjà connecté`);
        }
      } else {
        // Créer un nouveau joueur
        const dbPlayer = await this.playerDb.createOrUpdatePlayer(
          socketId,
          name,
          { x: 0, y: 5, z: 0 },
          { x: 0, y: 0, z: 0 }
        );

        // Créer l'objet PlayerData pour le cache mémoire
        const player: PlayerData = {
          id: dbPlayer.id,
          name: dbPlayer.name,
          position: dbPlayer.position,
          rotation: dbPlayer.rotation,
          isMoving: false,
          speed: 0,
          lastUpdate: Date.now(),
        };

        this.players.set(socketId, player);
        this.logger.log(`✅ Nouveau joueur créé: ${name} (${socketId})`);
        return player;
      }
    } catch (error) {
      this.logger.error(`❌ Erreur lors de la création du joueur ${name}:`, error);
      throw error;
    }
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

  async removePlayer(socketId: string): Promise<PlayerData | null> {
    const player = this.players.get(socketId);
    this.logger.log(`🗑️ Suppression du joueur ${socketId}:`, player);
    
    if (player) {
      // Marquer comme déconnecté en base de données
      await this.playerDb.disconnectPlayer(socketId);
      this.players.delete(socketId);
      this.logger.log(`✅ Joueur supprimé: ${player.name} (${socketId})`);
    }
    return player || null;
  }

  private async saveAllPlayerPositions(): Promise<void> {
    if (this.players.size === 0) return;
    
    try {
      await this.playerDb.saveAllPlayerPositions(this.players);
      this.lastSaveTime = Date.now();
    } catch (error) {
      this.logger.error('❌ Erreur lors de la sauvegarde périodique:', error);
    }
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
