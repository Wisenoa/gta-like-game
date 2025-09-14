import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { BlocksService, BlockType } from './blocks.service';

@Controller('api/blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Get('world')
  getWorld() {
    return this.blocksService.getWorldData();
  }

  @Get('chunk/:x/:z')
  getChunk(@Param('x') x: string, @Param('z') z: string) {
    const chunkX = parseInt(x);
    const chunkZ = parseInt(z);
    return this.blocksService.getChunk(chunkX, chunkZ);
  }

  @Get('block/:x/:y/:z')
  getBlock(@Param('x') x: string, @Param('y') y: string, @Param('z') z: string) {
    const blockX = parseInt(x);
    const blockY = parseInt(y);
    const blockZ = parseInt(z);
    return this.blocksService.getBlock(blockX, blockY, blockZ);
  }

  @Get('spawn-position')
  getSpawnPosition() {
    try {
      console.log('Recherche de position de spawn...');
      const spawnPos = this.blocksService.findSafeSpawnPosition();
      console.log('Position trouvée:', spawnPos);
      
      if (!spawnPos) {
        return { error: 'No safe spawn position found' };
      }
      return {
        position: spawnPos,
        message: 'Safe spawn position found'
      };
    } catch (error) {
      console.error('Erreur lors de la recherche de spawn:', error);
      return { error: 'Error finding spawn position' };
    }
  }

  @Get('test-spawn')
  testSpawn() {
    return {
      position: { x: 0, y: 70, z: 0 },
      message: 'Test spawn position in city'
    };
  }

  @Post('regenerate')
  async regenerateWorld() {
    try {
      const result = await this.blocksService.regenerateWorld();
      return result;
    } catch (error) {
      console.error('Erreur lors de la régénération:', error);
      return { error: 'Error regenerating world' };
    }
  }
}
