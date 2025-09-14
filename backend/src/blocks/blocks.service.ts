import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Types de blocs disponibles
export enum BlockType {
  AIR = 'air',
  STONE = 'stone',
  DIRT = 'dirt',
  GRASS = 'grass',
  WOOD = 'wood',
  LEAVES = 'leaves',
  SAND = 'sand',
  WATER = 'water',
  SNOW = 'snow',
  ICE = 'ice',
  CLAY = 'clay',
  GRAVEL = 'gravel',
  COAL = 'coal',
  IRON = 'iron',
  GOLD = 'gold',
  DIAMOND = 'diamond',
  BEDROCK = 'bedrock',
  ROAD = 'road',
  BUILDING_WALL = 'building_wall',
  BUILDING_FLOOR = 'building_floor',
  BUILDING_ROOF = 'building_roof',
  GLASS = 'glass',
  DOOR = 'door',
  WINDOW = 'window'
}

// Types de biomes
export enum BiomeType {
  PLAINS = 'plains',
  FOREST = 'forest',
  DESERT = 'desert',
  MOUNTAINS = 'mountains',
  OCEAN = 'ocean',
  TUNDRA = 'tundra',
  SWAMP = 'swamp',
  JUNGLE = 'jungle'
}

// Interface pour une face visible d'un bloc
export interface BlockFace {
  x: number;
  y: number;
  z: number;
  type: BlockType;
  face: 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';
  vertices: number[]; // 12 valeurs (4 vertices × 3 coordonnées)
  normals: number[]; // 12 valeurs (4 normals × 3 coordonnées)
  uvs: number[]; // 8 valeurs (4 UVs × 2 coordonnées)
}

// Interface pour un bloc individuel
export interface Block {
  x: number;
  y: number;
  z: number;
  type: BlockType;
  metadata?: {
    variant?: string;
    rotation?: number;
    [key: string]: any;
  };
}

// Interface pour un chunk (16x16x16 blocs)
export interface Chunk {
  x: number;
  z: number;
  blocks: Block[];
  lastUpdated: Date;
}

// Interface pour les données de monde
export interface WorldData {
  chunks: Chunk[];
  seed: number;
  version: string;
  generatedAt: string;
}

@Injectable()
export class BlocksService {
  private readonly logger = new Logger(BlocksService.name);
  private worldData: WorldData | null = null;
  private mapSeed = 12345;
  private readonly CHUNK_SIZE = 16;
  private readonly WORLD_HEIGHT = 32;
  private readonly SEA_LEVEL = 16;
  
  // Paramètres de génération
  private readonly noiseScale = 0.01;
  private readonly mountainScale = 0.005;
  private readonly hillScale = 0.02;
  private readonly detailScale = 0.1;

  constructor(private readonly prisma: PrismaService) {
    this.initializeWorld().catch((error) => {
      this.logger.error("❌ Erreur critique lors de l'initialisation du monde:", error);
    });
  }

  private async initializeWorld(): Promise<void> {
    try {
      this.logger.log('🌍 Initialisation du système de blocs...');
      // Ne plus générer tous les chunks au démarrage
      // Les chunks seront générés à la demande via generateChunkFaces
      this.logger.log('✅ Système de blocs initialisé (génération à la demande)');
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }

  // Obtenir un chunk complet (tous les blocs)
  public getChunk(chunkX: number, chunkZ: number): Chunk {
    const startTime = Date.now();
    
    console.log(`⏱️ Début génération chunk (${chunkX}, ${chunkZ})`);
    
    const chunk = this.generateChunk(chunkX, chunkZ);
    const totalTime = Date.now() - startTime;
    
    console.log(`⏱️ Chunk (${chunkX}, ${chunkZ}) généré en ${totalTime}ms avec ${chunk.blocks.length} blocs`);
    
    return chunk;
  }
  
  private processChunkFaces(chunk: Chunk): BlockFace[] {
    const faces: BlockFace[] = [];
    
    // Parcourir tous les blocs du chunk
    for (const block of chunk.blocks) {
      if (block.type === BlockType.AIR) continue;
      
      // Vérifier chaque face du bloc
      const facesToCheck = [
        { face: 'top' as const, dx: 0, dy: 1, dz: 0 },
        { face: 'bottom' as const, dx: 0, dy: -1, dz: 0 },
        { face: 'north' as const, dx: 0, dy: 0, dz: -1 },
        { face: 'south' as const, dx: 0, dy: 0, dz: 1 },
        { face: 'east' as const, dx: 1, dy: 0, dz: 0 },
        { face: 'west' as const, dx: -1, dy: 0, dz: 0 }
      ];
      
      for (const { face, dx, dy, dz } of facesToCheck) {
        const neighborX = block.x + dx;
        const neighborY = block.y + dy;
        const neighborZ = block.z + dz;
        
        // Vérifier si la face est visible
        const neighborBlock = this.getBlock(neighborX, neighborY, neighborZ);
        
        // La face est visible si le voisin est AIR ou n'existe pas
        if (!neighborBlock || neighborBlock.type === BlockType.AIR) {
          // Cette face est visible
          const faceData = this.generateBlockFace(block, face);
          faces.push(faceData);
        }
      }
    }
    
    return faces;
  }
  
  // Générer la géométrie d'une face de bloc
  private generateBlockFace(block: Block, face: 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west'): BlockFace {
    const x = block.x;
    const y = block.y;
    const z = block.z;
    
    // Définir les vertices pour chaque face
    const faceVertices = {
      top: [
        x, y + 1, z,           // 0
        x, y + 1, z + 1,        // 1
        x + 1, y + 1, z + 1,    // 2
        x + 1, y + 1, z         // 3
      ],
      bottom: [
        x, y, z,                // 0
        x, y, z + 1,            // 1
        x + 1, y, z + 1,        // 2
        x + 1, y, z             // 3
      ],
      north: [
        x, y, z,                // 0
        x, y + 1, z,            // 1
        x + 1, y + 1, z,        // 2
        x + 1, y, z             // 3
      ],
      south: [
        x + 1, y, z + 1,        // 0
        x + 1, y + 1, z + 1,    // 1
        x, y + 1, z + 1,        // 2
        x, y, z + 1             // 3
      ],
      east: [
        x + 1, y, z,            // 0
        x + 1, y + 1, z,        // 1
        x + 1, y + 1, z + 1,    // 2
        x + 1, y, z + 1         // 3
      ],
      west: [
        x, y, z + 1,            // 0
        x, y + 1, z + 1,        // 1
        x, y + 1, z,            // 2
        x, y, z                 // 3
      ]
    };
    
    // Définir les normales pour chaque face
    const faceNormals = {
      top: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
      bottom: [0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0],
      north: [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1],
      south: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      east: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      west: [-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0]
    };
    
    // UVs standard pour chaque face
    const faceUVs = [0, 0, 1, 0, 1, 1, 0, 1];
    
    return {
      x,
      y,
      z,
      type: block.type,
      face,
      vertices: faceVertices[face],
      normals: faceNormals[face],
      uvs: faceUVs
    };
  }
  
  // Générer le monde de base
  // Fonction de bruit simple (simulation de Perlin noise)
  private noise(x: number, z: number, scale: number): number {
    const n1 = Math.sin(x * scale) * Math.cos(z * scale);
    const n2 = Math.sin(x * scale * 2.1) * Math.cos(z * scale * 2.1) * 0.5;
    const n3 = Math.sin(x * scale * 4.2) * Math.cos(z * scale * 4.2) * 0.25;
    return n1 + n2 + n3;
  }

  // Fonction de bruit fractal (combinaison de plusieurs octaves)
  private fractalNoise(x: number, z: number, scale: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    
    for (let i = 0; i < octaves; i++) {
      value += this.noise(x, z, frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value;
  }

  // Déterminer le biome à une position
  private getBiome(x: number, z: number): BiomeType {
    const temperature = this.fractalNoise(x, z, 0.005, 3);
    const humidity = this.fractalNoise(x + 1000, z + 1000, 0.005, 3);
    
    // Classification des biomes basée sur température et humidité
    if (temperature < -0.3) {
      return humidity > 0.2 ? BiomeType.TUNDRA : BiomeType.MOUNTAINS;
    } else if (temperature > 0.3) {
      return humidity < -0.2 ? BiomeType.DESERT : BiomeType.JUNGLE;
    } else if (humidity > 0.3) {
      return BiomeType.SWAMP;
    } else if (humidity < -0.3) {
      return BiomeType.PLAINS;
    } else {
      return BiomeType.FOREST;
    }
  }

  // Générer un chunk spécifique
  private generateChunk(chunkX: number, chunkZ: number): Chunk {
    const blocks: Block[] = [];
    
    for (let x = 0; x < this.CHUNK_SIZE; x++) {
      for (let z = 0; z < this.CHUNK_SIZE; z++) {
        const worldX = chunkX * this.CHUNK_SIZE + x;
        const worldZ = chunkZ * this.CHUNK_SIZE + z;
        
        // Générer le terrain pour cette colonne
        const terrainHeight = this.getTerrainHeight(worldX, worldZ);
        
        for (let y = 0; y < this.WORLD_HEIGHT; y++) {
          const blockType = this.getBlockType(worldX, y, worldZ, terrainHeight);
          
          // Inclure tous les blocs (y compris AIR) pour le face culling côté frontend
          blocks.push({
            x: worldX,
            y: y,
            z: worldZ,
            type: blockType
          });
        }
      }
    }
    
    return {
      x: chunkX,
      z: chunkZ,
      blocks,
      lastUpdated: new Date()
    };
  }

  // Calculer la hauteur du terrain à une position donnée
  private getTerrainHeight(x: number, z: number): number {
    // Distance du centre (0,0)
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    const cityRadius = 500; // Rayon de la ville plate
    
    // Zone centrale : ville plate à Y=10
    if (distanceFromCenter < cityRadius) {
      return 10; // Hauteur fixe pour toute la ville
    }
    
    // Zone périphérique : montagnes simples
    const mountainFactor = Math.min(1, (distanceFromCenter - cityRadius) / 200);
    const mountainHeight = 10 + Math.floor(mountainFactor * 30); // De 10 à 40
    
    return mountainHeight;
  }

  // Déterminer le type de bloc à une position donnée
  private getBlockType(x: number, y: number, z: number, terrainHeight: number): BlockType {
    // Bedrock en bas
    if (y === 0) {
      return BlockType.BEDROCK;
    }
    
    // Vérifier si on est dans la zone urbaine
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    const cityRadius = 500;
    
    if (distanceFromCenter < cityRadius) {
      // Zone urbaine : générer des bâtiments
      const buildingBlock = this.getUrbanBlock(x, y, z, terrainHeight);
      if (buildingBlock !== null) {
        return buildingBlock;
      }
    }
    
    // Air au-dessus du terrain
    if (y > terrainHeight) {
      return BlockType.AIR;
    }
    
    // Surface : bloc de surface selon la zone
    if (y === terrainHeight) {
      if (distanceFromCenter < cityRadius) {
        return BlockType.STONE; // Surface urbaine
      } else {
        return BlockType.GRASS; // Surface naturelle
      }
    }
    
    // Sous-sol : couches simples
    if (y >= terrainHeight - 3) {
      return BlockType.DIRT; // Couche de terre
    } else {
      return BlockType.STONE; // Couche de pierre
    }
  }

  // Générer des blocs urbains (bâtiments, routes, etc.)
  private getUrbanBlock(x: number, y: number, z: number, terrainHeight: number): BlockType | null {
    // Routes : grille de routes tous les 16 blocs
    if (this.isRoad(x, z)) {
      if (y === terrainHeight) {
        return BlockType.ROAD;
      }
      if (y < terrainHeight && y >= terrainHeight - 2) {
        return BlockType.STONE; // Fondation de route
      }
    }
    
    // Bâtiments : générer des bâtiments sur les blocs non-route
    if (!this.isRoad(x, z)) {
      return this.generateBuilding(x, y, z, terrainHeight);
    }
    
    return null; // Pas de bloc urbain spécial
  }
  
  // Vérifier si une position est sur une route
  private isRoad(x: number, z: number): boolean {
    const roadSpacing = 16; // Espacement des routes
    const roadWidth = 4; // Largeur des routes
    
    // Routes horizontales
    if (Math.abs(z % roadSpacing) < roadWidth) {
      return true;
    }
    
    // Routes verticales
    if (Math.abs(x % roadSpacing) < roadWidth) {
      return true;
    }
    
    return false;
  }
  
  // Générer un bâtiment à une position
  private generateBuilding(x: number, y: number, z: number, terrainHeight: number): BlockType | null {
    // Utiliser une graine basée sur la position pour la cohérence
    const seed = x * 1000 + z;
    const random = this.seededRandom(seed);
    
    // Déterminer la taille du bâtiment (3-8 étages max)
    const buildingHeight = Math.floor(random() * 6) + 3; // 3-8 étages
    const buildingTop = terrainHeight + buildingHeight;
    
    // Vérifier si on est dans le bâtiment
    if (y >= terrainHeight && y <= buildingTop) {
      // Fondation
      if (y === terrainHeight) {
        return BlockType.BUILDING_FLOOR;
      }
      
      // Murs
      if (y < buildingTop) {
        // Fenêtres occasionnelles
        if (random() < 0.2) {
          return BlockType.GLASS;
        }
        return BlockType.BUILDING_WALL;
      }
      
      // Toit
      if (y === buildingTop) {
        return BlockType.BUILDING_ROOF;
      }
    }
    
    return null;
  }
  
  // Générateur de nombres aléatoires avec graine
  private seededRandom(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  // Obtenir le bloc de surface selon le biome
  private getSurfaceBlock(biome: BiomeType, y: number): BlockType {
    switch (biome) {
      case BiomeType.DESERT:
        return BlockType.SAND;
      case BiomeType.TUNDRA:
        return y > this.SEA_LEVEL + 20 ? BlockType.SNOW : BlockType.GRASS;
      case BiomeType.MOUNTAINS:
        return y > this.SEA_LEVEL + 25 ? BlockType.SNOW : BlockType.STONE;
      case BiomeType.SWAMP:
        return BlockType.GRASS; // Pourrait être de la boue
      case BiomeType.OCEAN:
        return BlockType.SAND;
      default:
        return BlockType.GRASS;
    }
  }

  // Obtenir le bloc souterrain selon le biome et la profondeur
  private getUndergroundBlock(biome: BiomeType, x: number, y: number, z: number, terrainHeight: number): BlockType {
    const depth = terrainHeight - y;
    
    // Couche de surface (1-3 blocs sous la surface)
    if (depth <= 3) {
      switch (biome) {
        case BiomeType.DESERT:
          return BlockType.SAND;
        case BiomeType.SWAMP:
          return BlockType.CLAY;
        default:
          return BlockType.DIRT;
      }
    }
    
    // Couche intermédiaire (4-10 blocs sous la surface)
    if (depth <= 10) {
      // Chance de minerais dans cette couche
      const oreChance = this.fractalNoise(x, z, 0.1);
      if (oreChance > 0.7) {
        return this.getRandomOre(depth);
      }
      
      switch (biome) {
        case BiomeType.DESERT:
          return BlockType.SAND;
        case BiomeType.MOUNTAINS:
          return BlockType.STONE;
        default:
          return BlockType.DIRT;
      }
    }
    
    // Couche profonde (11+ blocs sous la surface)
    if (depth <= 20) {
      // Plus de chance de minerais dans les couches profondes
      const oreChance = this.fractalNoise(x, z, 0.1);
      if (oreChance > 0.6) {
        return this.getRandomOre(depth);
      }
      return BlockType.STONE;
    }
    
    // Très profond : pierre avec chance de minerais rares
    const rareOreChance = this.fractalNoise(x, z, 0.05);
    if (rareOreChance > 0.8) {
      return this.getRandomRareOre(depth);
    }
    
    return BlockType.STONE;
  }

  // Obtenir un minerai aléatoire commun
  private getRandomOre(depth: number): BlockType {
    const oreTypes = [BlockType.COAL, BlockType.IRON, BlockType.GRAVEL];
    const randomIndex = Math.floor(Math.random() * oreTypes.length);
    return oreTypes[randomIndex];
  }

  // Obtenir un minerai rare
  private getRandomRareOre(depth: number): BlockType {
    const rareOreTypes = [BlockType.GOLD, BlockType.DIAMOND];
    const randomIndex = Math.floor(Math.random() * rareOreTypes.length);
    return rareOreTypes[randomIndex];
  }

  // Obtenir les données du monde
  public getWorldData(): WorldData | null {
    return this.worldData;
  }

  // Obtenir un chunk spécifique

  // Obtenir un bloc spécifique
  public getBlock(x: number, y: number, z: number): Block | null {
    // Vérifier les limites du monde
    if (y < 0 || y >= this.WORLD_HEIGHT) {
      return null; // Hors limites verticales
    }
    
    // Générer le bloc à la demande
    const terrainHeight = this.getTerrainHeight(x, z);
    const blockType = this.getBlockType(x, y, z, terrainHeight);
    
    // Toujours retourner un bloc, même si c'est AIR
    return {
      x: x,
      y: y,
      z: z,
      type: blockType
    };
  }

  // Régénérer le monde (maintenant juste changer la seed)
  public async regenerateWorld(): Promise<{ message: string, chunksCount: number, totalBlocks: number }> {
    this.logger.log('🔄 Régénération du monde de blocs...');
    
    // Changer la seed pour générer un monde différent
    this.mapSeed = Math.floor(Math.random() * 1000000);
    
    // Vider le cache des chunks pour forcer la régénération
    this.worldData = null;
    
    this.logger.log(`✅ Monde régénéré avec nouvelle seed: ${this.mapSeed}`);
    
    return {
      message: 'Monde régénéré avec succès',
      chunksCount: 0, // Les chunks seront générés à la demande
      totalBlocks: 0  // Les blocs seront générés à la demande
    };
  }

  // Trouver une position de spawn sûre au-dessus du terrain
  public findSafeSpawnPosition(): { x: number, y: number, z: number } | null {
    // Position de spawn dans la ville plate au centre
    return {
      x: 0,
      y: 70, // Hauteur de la ville plate (64 + 6)
      z: 0
    };
  }
}
