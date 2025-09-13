import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlayerPositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  z: number;
}

export class PlayerRotationDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  z: number;
}

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  playerName: string;
}

export class PlayerMoveDto {
  @IsObject()
  @ValidateNested()
  @Type(() => PlayerPositionDto)
  position: PlayerPositionDto;

  @IsObject()
  @ValidateNested()
  @Type(() => PlayerRotationDto)
  rotation: PlayerRotationDto;

  @IsNumber()
  isMoving: number;

  @IsNumber()
  speed: number;
}

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  playerName: string;
}
