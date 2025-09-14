import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RoomService } from '../rooms/room.service';
import { PlayerService } from '../players/player.service';
import { MapService } from '../map/map.service';
import { GameGateway } from '../events/game.gateway';

@Controller('api')
export class GameController {
  constructor(
    private readonly roomService: RoomService,
    private readonly playerService: PlayerService,
    private readonly mapService: MapService,
    private readonly gameGateway: GameGateway,
  ) {}

  @Get('rooms')
  getRooms() {
    return this.roomService.getAllRooms();
  }

  @Get('rooms/:id')
  getRoom(@Param('id') id: string) {
    return this.roomService.getRoom(id);
  }

  @Get('players')
  getPlayers() {
    return this.playerService.getAllPlayers();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      players: this.playerService.getAllPlayers().length,
      rooms: this.roomService.getAllRooms().length,
    };
  }

  @Get('map')
  getMap() {
    return this.mapService.getMapData();
  }

  @Post('map/regenerate')
  async regenerateMap() {
    const newMapData = await this.mapService.forceRegenerateMap();
    
    // Notifier tous les clients connectés de la nouvelle carte
    this.gameGateway.broadcastMapData();
    
    return { 
      message: 'Map regenerated successfully', 
      elementsCount: newMapData.elements.length 
    };
  }
}
