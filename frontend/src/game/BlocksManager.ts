import * as THREE from "three";

// Types de blocs (même que le backend)
export enum BlockType {
  AIR = 'air',
  STONE = 'stone',
  DIRT = 'dirt',
  GRASS = 'grass',
  WOOD = 'wood',
  LEAVES = 'leaves',
  SAND = 'sand',
  WATER = 'water',
  ROAD = 'road',
  BUILDING_WALL = 'building_wall',
  BUILDING_FLOOR = 'building_floor',
  BUILDING_ROOF = 'building_roof',
  GLASS = 'glass',
  DOOR = 'door',
  WINDOW = 'window'
}

// Interface pour un bloc
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

// Interface pour un chunk
export interface Chunk {
  x: number;
  z: number;
  blocks: Block[];
  lastUpdated: string;
}

// Interface pour les données du monde
export interface WorldData {
  chunks: Chunk[];
  seed: number;
  version: string;
  generatedAt: string;
}

// Couleurs des blocs
export const BLOCK_COLORS: Record<BlockType, string> = {
  [BlockType.AIR]: '#000000', // Transparent
  [BlockType.STONE]: '#808080', // Gris
  [BlockType.DIRT]: '#8B4513', // Brun
  [BlockType.GRASS]: '#90EE90', // Vert clair
  [BlockType.WOOD]: '#DEB887', // Beige
  [BlockType.LEAVES]: '#228B22', // Vert foncé
  [BlockType.SAND]: '#F4A460', // Sable
  [BlockType.WATER]: '#4169E1', // Bleu
  [BlockType.ROAD]: '#404040', // Gris foncé
  [BlockType.BUILDING_WALL]: '#8B4513', // Brun
  [BlockType.BUILDING_FLOOR]: '#D2B48C', // Beige
  [BlockType.BUILDING_ROOF]: '#696969', // Gris foncé
  [BlockType.GLASS]: '#87CEEB', // Bleu ciel
  [BlockType.DOOR]: '#654321', // Brun foncé
  [BlockType.WINDOW]: '#E6E6FA', // Lavande
};

export class BlocksManager {
  private scene: THREE.Scene;
  private blockMeshes: Map<string, THREE.Mesh> = new Map();
  private chunkMeshes: Map<string, THREE.Group> = new Map();
  private blockGeometry: THREE.BoxGeometry;
  private blockMaterials: Map<BlockType, THREE.MeshLambertMaterial> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeBlockAssets();
  }

  // Initialiser les géométries et matériaux des blocs
  private initializeBlockAssets(): void {
    // Géométrie de base pour tous les blocs (cube 1x1x1)
    this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);

    // Créer les matériaux pour chaque type de bloc
    Object.values(BlockType).forEach(blockType => {
      if (blockType !== BlockType.AIR) {
        const color = BLOCK_COLORS[blockType];
        const material = new THREE.MeshLambertMaterial({ color });
        
        // Matériaux spéciaux
        if (blockType === BlockType.WATER) {
          material.transparent = true;
          material.opacity = 0.7;
        } else if (blockType === BlockType.GLASS) {
          material.transparent = true;
          material.opacity = 0.3;
        }
        
        this.blockMaterials.set(blockType, material);
      }
    });
  }

  // Charger et afficher les chunks
  public loadChunks(worldData: WorldData): void {
    console.log(`🧱 Chargement de ${worldData.chunks.length} chunks...`);
    
    // Nettoyer les chunks existants
    this.clearAllChunks();
    
    // Charger chaque chunk
    worldData.chunks.forEach(chunk => {
      this.loadChunk(chunk);
    });
    
    console.log(`✅ ${worldData.chunks.length} chunks chargés avec succès`);
  }

  // Charger un chunk spécifique
  private loadChunk(chunk: Chunk): void {
    const chunkKey = `${chunk.x},${chunk.z}`;
    const chunkGroup = new THREE.Group();
    
    // Positionner le chunk
    chunkGroup.position.set(
      chunk.x * 16, // 16 blocs par chunk
      0,
      chunk.z * 16
    );
    
    // Ajouter les blocs du chunk
    chunk.blocks.forEach(block => {
      if (block.type !== BlockType.AIR) {
        const blockMesh = this.createBlockMesh(block);
        if (blockMesh) {
          chunkGroup.add(blockMesh);
        }
      }
    });
    
    // Ajouter le chunk à la scène
    this.scene.add(chunkGroup);
    this.chunkMeshes.set(chunkKey, chunkGroup);
    
    console.log(`🧱 Chunk (${chunk.x}, ${chunk.z}) chargé avec ${chunk.blocks.length} blocs`);
  }

  // Créer un mesh pour un bloc
  private createBlockMesh(block: Block): THREE.Mesh | null {
    const material = this.blockMaterials.get(block.type);
    if (!material) return null;
    
    const mesh = new THREE.Mesh(this.blockGeometry, material);
    
    // Positionner le bloc dans le chunk
    mesh.position.set(
      block.x % 16, // Position relative dans le chunk
      block.y,
      block.z % 16
    );
    
    // Ajouter des métadonnées
    mesh.userData = {
      blockType: block.type,
      worldPosition: { x: block.x, y: block.y, z: block.z },
      metadata: block.metadata
    };
    
    return mesh;
  }

  // Nettoyer tous les chunks
  private clearAllChunks(): void {
    this.chunkMeshes.forEach((chunkGroup, key) => {
      this.scene.remove(chunkGroup);
      chunkGroup.clear();
    });
    this.chunkMeshes.clear();
    this.blockMeshes.clear();
  }

  // Obtenir un bloc à une position donnée
  public getBlockAt(x: number, y: number, z: number): THREE.Mesh | null {
    const chunkX = Math.floor(x / 16);
    const chunkZ = Math.floor(z / 16);
    const chunkKey = `${chunkX},${chunkZ}`;
    const chunkGroup = this.chunkMeshes.get(chunkKey);
    
    if (!chunkGroup) return null;
    
    // Chercher le bloc dans le chunk
    let foundBlock: THREE.Mesh | null = null;
    chunkGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.worldPosition) {
        const pos = child.userData.worldPosition;
        if (pos.x === x && pos.y === y && pos.z === z) {
          foundBlock = child;
        }
      }
    });
    
    return foundBlock;
  }

  // Obtenir tous les blocs dans un rayon
  public getBlocksInRadius(centerX: number, centerY: number, centerZ: number, radius: number): THREE.Mesh[] {
    const blocks: THREE.Mesh[] = [];
    
    this.chunkMeshes.forEach((chunkGroup) => {
      chunkGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.worldPosition) {
          const pos = child.userData.worldPosition;
          const distance = Math.sqrt(
            Math.pow(pos.x - centerX, 2) +
            Math.pow(pos.y - centerY, 2) +
            Math.pow(pos.z - centerZ, 2)
          );
          
          if (distance <= radius) {
            blocks.push(child);
          }
        }
      });
    });
    
    return blocks;
  }

  // Mettre à jour un bloc spécifique
  public updateBlock(x: number, y: number, z: number, newType: BlockType): void {
    const existingBlock = this.getBlockAt(x, y, z);
    
    if (existingBlock) {
      // Remplacer le bloc existant
      const material = this.blockMaterials.get(newType);
      if (material) {
        existingBlock.material = material;
        existingBlock.userData.blockType = newType;
      }
    } else if (newType !== BlockType.AIR) {
      // Créer un nouveau bloc
      const block: Block = { x, y, z, type: newType };
      const newMesh = this.createBlockMesh(block);
      
      if (newMesh) {
        const chunkX = Math.floor(x / 16);
        const chunkZ = Math.floor(z / 16);
        const chunkKey = `${chunkX},${chunkZ}`;
        const chunkGroup = this.chunkMeshes.get(chunkKey);
        
        if (chunkGroup) {
          chunkGroup.add(newMesh);
        }
      }
    }
  }

  // Obtenir les statistiques du monde
  public getWorldStats(): { totalBlocks: number; chunkCount: number; blockTypes: Record<string, number> } {
    let totalBlocks = 0;
    const blockTypes: Record<string, number> = {};
    
    this.chunkMeshes.forEach((chunkGroup) => {
      chunkGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.blockType) {
          totalBlocks++;
          const blockType = child.userData.blockType;
          blockTypes[blockType] = (blockTypes[blockType] || 0) + 1;
        }
      });
    });
    
    return {
      totalBlocks,
      chunkCount: this.chunkMeshes.size,
      blockTypes
    };
  }
}
