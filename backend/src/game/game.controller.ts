import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RoomService } from '../rooms/room.service';
import { PlayerService } from '../players/player.service';

@Controller('api')
export class GameController {
  constructor(
    private readonly roomService: RoomService,
    private readonly playerService: PlayerService,
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
}
