import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameGateway } from './events/game.gateway';
import { GameController } from './game/game.controller';
import { PlayerService } from './players/player.service';
import { RoomService } from './rooms/room.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, GameController],
  providers: [AppService, GameGateway, PlayerService, RoomService],
})
export class AppModule {}
