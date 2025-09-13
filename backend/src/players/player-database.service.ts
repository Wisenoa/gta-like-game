import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Player as PrismaPlayer } from '@prisma/client';

export interface PlayerData {
  id: string;
  socketId: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  health: number;
  maxHealth: number;
  isOnline: boolean;
  lastSeen: Date;
  totalPlayTime: number;
}

@Injectable()
export class PlayerDatabaseService {
  private readonly logger = new Logger(PlayerDatabaseService.name);
  private readonly playerCache = new Map<string, PlayerData>();

  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdatePlayer(
    socketId: string,
    name: string,
    position: any,
    rotation: any,
  ): Promise<PlayerData> {
    try {
      // Vérifier si un joueur avec ce nom existe déjà
      const existingPlayer = await this.prisma.player.findUnique({
        where: { name },
      });

      if (existingPlayer) {
        // Mettre à jour le joueur existant
        const updatedPlayer = await this.prisma.player.update({
          where: { name },
          data: {
            socketId,
            position: position as any,
            rotation: rotation as any,
            isOnline: true,
            lastSeen: new Date(),
          },
        });

        this.logger.log(`✅ Joueur existant mis à jour: ${name}`);
        return this.mapToPlayerData(updatedPlayer);
      } else {
        // Créer un nouveau joueur
        const newPlayer = await this.prisma.player.create({
          data: {
            socketId,
            name,
            position: position as any,
            rotation: rotation as any,
            health: 100,
            maxHealth: 100,
            isOnline: true,
            lastSeen: new Date(),
            totalPlayTime: 0,
          },
        });

        this.logger.log(`✅ Nouveau joueur créé: ${name}`);
        return this.mapToPlayerData(newPlayer);
      }
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(`Le nom "${name}" est déjà utilisé`);
      }
      this.logger.error(
        `❌ Erreur lors de la création/mise à jour du joueur ${name}:`,
        error,
      );
      throw error;
    }
  }

  async updatePlayerPosition(
    playerId: string,
    position: any,
    rotation: any,
  ): Promise<void> {
    try {
      await this.prisma.player.update({
        where: { id: playerId },
        data: {
          position: position as any,
          rotation: rotation as any,
          lastSeen: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la mise à jour de la position du joueur ${playerId}:`,
        error,
      );
    }
  }

  async updatePlayerHealth(playerId: string, health: number): Promise<void> {
    try {
      await this.prisma.player.update({
        where: { id: playerId },
        data: {
          health: Math.max(0, Math.min(health, 100)),
          lastSeen: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la mise à jour de la santé du joueur ${playerId}:`,
        error,
      );
    }
  }

  async disconnectPlayer(socketId: string): Promise<void> {
    try {
      const player = await this.prisma.player.findUnique({
        where: { socketId },
      });

      if (player) {
        await this.prisma.player.update({
          where: { socketId },
          data: {
            socketId: null,
            isOnline: false,
            lastSeen: new Date(),
          },
        });
        this.logger.log(`✅ Joueur déconnecté: ${player.name}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la déconnexion du joueur ${socketId}:`,
        error,
      );
    }
  }

  async getPlayerByName(name: string): Promise<PlayerData | null> {
    try {
      const player = await this.prisma.player.findUnique({
        where: { name },
      });

      return player ? this.mapToPlayerData(player) : null;
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la récupération du joueur ${name}:`,
        error,
      );
      return null;
    }
  }

  async getPlayerBySocketId(socketId: string): Promise<PlayerData | null> {
    try {
      const player = await this.prisma.player.findUnique({
        where: { socketId },
      });

      return player ? this.mapToPlayerData(player) : null;
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la récupération du joueur par socket ${socketId}:`,
        error,
      );
      return null;
    }
  }

  async getAllOnlinePlayers(): Promise<PlayerData[]> {
    try {
      const players = await this.prisma.player.findMany({
        where: { isOnline: true },
      });

      return players.map((player) => this.mapToPlayerData(player));
    } catch (error) {
      this.logger.error(
        '❌ Erreur lors de la récupération des joueurs en ligne:',
        error,
      );
      return [];
    }
  }

  async isNameAvailable(name: string): Promise<boolean> {
    try {
      const player = await this.prisma.player.findUnique({
        where: { name },
      });
      return !player;
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la vérification du nom ${name}:`,
        error,
      );
      return false;
    }
  }

  private mapToPlayerData(player: PrismaPlayer): PlayerData {
    return {
      id: player.id,
      socketId: player.socketId || '',
      name: player.name,
      position: player.position as any,
      rotation: player.rotation as any,
      health: player.health,
      maxHealth: player.maxHealth,
      isOnline: player.isOnline,
      lastSeen: player.lastSeen,
      totalPlayTime: player.totalPlayTime,
    };
  }

  // Méthode pour sauvegarder périodiquement les positions (à appeler toutes les 30 secondes)
  async saveAllPlayerPositions(players: Map<string, any>): Promise<void> {
    try {
      const updates = Array.from(players.entries()).map(
        ([socketId, playerData]) => ({
          where: { socketId },
          data: {
            position: playerData.position as any,
            rotation: playerData.rotation as any,
            health: playerData.health,
            lastSeen: new Date(),
          },
        }),
      );

      // Exécuter toutes les mises à jour en parallèle
      await Promise.all(
        updates.map((update) =>
          this.prisma.player
            .update(update)
            .catch((error) =>
              this.logger.error(
                `❌ Erreur lors de la sauvegarde du joueur ${update.where.socketId}:`,
                error,
              ),
            ),
        ),
      );

      this.logger.log(`✅ Positions de ${updates.length} joueurs sauvegardées`);
    } catch (error) {
      this.logger.error(
        '❌ Erreur lors de la sauvegarde des positions:',
        error,
      );
    }
  }
}
