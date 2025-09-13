import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PlayerService } from '../players/player.service';
import { RoomService } from '../rooms/room.service';
import { JoinRoomDto, PlayerMoveDto, ChatMessageDto } from '../game/dto';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://192.168.1.21:3000', // IP locale frontend
      'http://192.168.1.21:5173', // IP locale frontend (port alternatif)
      /^https:\/\/.*\.ngrok\.io$/,
      /^https:\/\/.*\.ngrok-free\.app$/,
    ],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private readonly playerService: PlayerService,
    private readonly roomService: RoomService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);

    const player = this.playerService.getPlayer(client.id);
    if (player) {
      // Notification serveur pour la déconnexion
      const disconnectNotification = {
        type: 'playerDisconnected',
        playerName: player.name,
        message: `${player.name} a quitté le jeu`,
        timestamp: new Date().toISOString(),
      };
      this.server.emit('serverNotification', disconnectNotification);

      // Notifier les autres joueurs de la déconnexion
      this.server.emit('playerDisconnected', player.id);

      // Supprimer le joueur
      this.playerService.removePlayer(client.id);
    }
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() joinRoomDto: JoinRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Joueur ${joinRoomDto.playerName} rejoint le jeu`);

    // Créer le joueur
    const player = this.playerService.createPlayer(
      client.id,
      joinRoomDto.playerName,
    );

    // Ajouter à la room par défaut
    const room = this.roomService.getDefaultRoom();
    if (room) {
      this.roomService.addPlayerToRoom(room.id, player.id, player);

      // Rejoindre la room Socket.io
      client.join(room.id);

      // Envoyer les données du joueur au client
      this.logger.log(`📤 Envoi playerJoined au client ${client.id}:`, player);
      client.emit('playerJoined', player);

      // Notifier les autres joueurs
      this.logger.log(
        `📤 Diffusion playerJoined aux autres joueurs de la room ${room.id}`,
      );
      client.to(room.id).emit('playerJoined', player);

      // Notification serveur pour la connexion
      const joinNotification = {
        type: 'playerJoined',
        playerName: player.name,
        message: `${player.name} a rejoint le jeu`,
        timestamp: new Date().toISOString(),
      };
      this.server.emit('serverNotification', joinNotification);

      // Envoyer la liste des joueurs existants
      const existingPlayers = this.roomService
        .getRoomPlayers(room.id)
        .filter((p) => p.id !== player.id);
      this.logger.log(
        `📤 Envoi existingPlayers au client ${client.id}:`,
        existingPlayers,
      );
      client.emit('existingPlayers', existingPlayers);
    }
  }

  @SubscribeMessage('playerMove')
  handlePlayerMove(
    @MessageBody() playerMoveDto: PlayerMoveDto,
    @ConnectedSocket() client: Socket,
  ) {
    const player = this.playerService.updatePlayerPosition(
      client.id,
      playerMoveDto.position,
      playerMoveDto.rotation,
      playerMoveDto.isMoving === 1,
      playerMoveDto.speed,
    );

    if (player) {
      // Ne diffuser que si le joueur bouge vraiment (vitesse > 0.5 pour éviter le spam)
      if (player.isMoving) {
        const moveData = {
          playerId: player.id,
          position: player.position,
          rotation: player.rotation,
          isMoving: player.isMoving,
          speed: player.speed,
        };

        client.broadcast.emit('playerMoved', moveData);
      }
    }
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(
    @MessageBody() chatMessageDto: ChatMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const player = this.playerService.getPlayer(client.id);
    if (player) {
      const messageData = {
        playerId: player.id,
        playerName: player.name,
        message: chatMessageDto.message,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(
        `💬 Message de ${player.name}: ${chatMessageDto.message}`,
      );

      // Diffuser le message à tous les joueurs de la room
      this.server.emit('chatMessage', messageData);
    }
  }

  @SubscribeMessage('getPlayers')
  handleGetPlayers(@ConnectedSocket() client: Socket) {
    const players = this.playerService.getAllPlayers();
    client.emit('playersList', players);
  }
}
