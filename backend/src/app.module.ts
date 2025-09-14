import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameGateway } from './events/game.gateway';
import { GameController } from './game/game.controller';
import { BlocksController } from './blocks/blocks.controller';
import { PlayerService } from './players/player.service';
import { PlayerDatabaseService } from './players/player-database.service';
import { RoomService } from './rooms/room.service';
import { MapModule } from './map/map.module';
import { PrismaModule } from './prisma/prisma.module';
import { BlocksModule } from './blocks/blocks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    MapModule,
    BlocksModule,
  ],
  controllers: [AppController, GameController, BlocksController],
  providers: [AppService, GameGateway, PlayerService, PlayerDatabaseService, RoomService],
})
export class AppModule {}
