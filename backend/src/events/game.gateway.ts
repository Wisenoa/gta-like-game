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
import { JoinRoomDto, PlayerMoveDto } from '../game/dto';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000', 
      'http://localhost:5173',
      /^https:\/\/.*\.ngrok\.io$/,
      /^https:\/\/.*\.ngrok-free\.app$/
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
    const player = this.playerService.createPlayer(client.id, joinRoomDto.playerName);
    
    // Ajouter à la room par défaut
    const room = this.roomService.getDefaultRoom();
    if (room) {
      this.roomService.addPlayerToRoom(room.id, player.id, player);
      
      // Rejoindre la room Socket.io
      client.join(room.id);
      
      // Envoyer les données du joueur au client
      client.emit('playerJoined', player);
      
      // Notifier les autres joueurs
      client.to(room.id).emit('playerJoined', player);
      
      // Envoyer la liste des joueurs existants
      const existingPlayers = this.roomService.getRoomPlayers(room.id)
        .filter(p => p.id !== player.id);
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
      // Diffuser le mouvement aux autres joueurs
      client.broadcast.emit('playerMoved', {
        playerId: player.id,
        position: player.position,
        rotation: player.rotation,
        isMoving: player.isMoving,
        speed: player.speed,
      });
    }
  }

  @SubscribeMessage('getPlayers')
  handleGetPlayers(@ConnectedSocket() client: Socket) {
    const players = this.playerService.getAllPlayers();
    client.emit('playersList', players);
  }
}
