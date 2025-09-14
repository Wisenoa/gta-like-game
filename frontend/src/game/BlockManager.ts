import * as THREE from 'three';

export interface BlockData {
  x: number;
  y: number;
  z: number;
  type: string;
}

export interface SpawnPosition {
  x: number;
  y: number;
  z: number;
}

export interface SpawnResponse {
  position: SpawnPosition;
  message: string;
}

export interface ChunkData {
  x: number;
  z: number;
  blocks: BlockData[];
  lastUpdated: string;
}

export interface WorldData {
  chunks: ChunkData[];
  seed: number;
  version: string;
  generatedAt: string;
}

export class BlockManager {
  private scene: THREE.Scene;
  private blockMeshes: Map<string, THREE.Mesh> = new Map();
  private blockMaterials: Map<string, THREE.MeshLambertMaterial> = new Map();
  private worldData: WorldData | null = null;
  private spawnPosition: SpawnPosition | null = null;
  
  // Système de chunks
  private loadedChunks: Map<string, ChunkData> = new Map();
  private chunkGroups: Map<string, THREE.Group> = new Map();
  private chunkRadius: number = 3; // Rayon de chunks à charger autour du joueur
  private chunkSize: number = 16; // Taille d'un chunk (16x16x128)
  private lastPlayerChunk: { x: number, z: number } | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeMaterials();
  }

  private initializeMaterials(): void {
    // Créer les matériaux pour chaque type de bloc
    const materialConfigs = {
      // Blocs de base
      stone: { color: 0x808080, roughness: 0.8 },
      dirt: { color: 0x8B4513, roughness: 0.9 },
      grass: { color: 0x228B22, roughness: 0.7 },
      sand: { color: 0xF4A460, roughness: 0.6 },
      water: { color: 0x006994, roughness: 0.1, transparent: true, opacity: 0.8 },
      bedrock: { color: 0x1C1C1C, roughness: 1.0 },
      
      // Blocs de végétation
      wood: { color: 0x8B4513, roughness: 0.8 },
      leaves: { color: 0x32CD32, roughness: 0.9 },
      
      // Blocs de climat
      snow: { color: 0xFFFFFF, roughness: 0.9 },
      ice: { color: 0x87CEEB, roughness: 0.1, transparent: true, opacity: 0.9 },
      clay: { color: 0xCD853F, roughness: 0.8 },
      gravel: { color: 0x696969, roughness: 0.9 },
      
      // Minerais
      coal: { color: 0x2F2F2F, roughness: 0.9 },
      iron: { color: 0xCD853F, roughness: 0.7 },
      gold: { color: 0xFFD700, roughness: 0.3 },
      diamond: { color: 0x00FFFF, roughness: 0.1 },
      
      // Blocs de construction
      road: { color: 0x404040, roughness: 0.8 },
      building_wall: { color: 0x8B7355, roughness: 0.8 },
      building_floor: { color: 0xD2B48C, roughness: 0.7 },
      building_roof: { color: 0x8B0000, roughness: 0.9 },
      glass: { color: 0x87CEEB, roughness: 0.1, transparent: true, opacity: 0.3 },
      door: { color: 0x8B4513, roughness: 0.8 },
      window: { color: 0x87CEEB, roughness: 0.1, transparent: true, opacity: 0.5 }
    };

    for (const [type, config] of Object.entries(materialConfigs)) {
      this.blockMaterials.set(type, new THREE.MeshLambertMaterial(config));
    }
  }

  private getBlockKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  private createBlockMesh(blockData: BlockData): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = this.blockMaterials.get(blockData.type) || this.blockMaterials.get('stone')!;
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(blockData.x, blockData.y, blockData.z);
    
    // Ajouter des métadonnées pour faciliter la gestion
    mesh.userData = {
      blockType: blockData.type,
      blockPosition: { x: blockData.x, y: blockData.y, z: blockData.z }
    };

    return mesh;
  }

  public async loadWorldData(): Promise<void> {
    try {
      console.log('🌍 Chargement des données du monde...');
      
      // Charger seulement les chunks autour du spawn
      const spawnPos = await this.getSpawnPosition();
      if (spawnPos) {
        await this.loadChunksAroundPosition(spawnPos.x, spawnPos.z);
      } else {
        // Fallback : charger quelques chunks autour de (0,0)
        await this.loadChunksAroundPosition(0, 0);
      }
      
      console.log(`✅ Monde chargé avec ${this.loadedChunks.size} chunks`);
    } catch (error) {
      console.error('❌ Erreur lors du chargement du monde:', error);
      // Fallback : créer un monde de test
      this.createTestWorld();
    }
  }

  public async getSpawnPosition(): Promise<SpawnPosition | null> {
    try {
      console.log('📍 Récupération de la position de spawn...');
      const response = await fetch('http://localhost:3002/api/blocks/spawn-position');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const spawnData: SpawnResponse = await response.json();
      this.spawnPosition = spawnData.position;
      console.log('✅ Position de spawn récupérée:', this.spawnPosition);
      
      return this.spawnPosition;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la position de spawn:', error);
      
      // Position de spawn par défaut
      this.spawnPosition = { x: 0, y: 70, z: 0 };
      console.log('🧪 Utilisation de la position de spawn par défaut:', this.spawnPosition);
      
      return this.spawnPosition;
    }
  }

  // === SYSTÈME DE CHUNKS ===
  
  private getChunkKey(x: number, z: number): string {
    return `${x},${z}`;
  }
  
  private getChunkCoordinates(worldX: number, worldZ: number): { x: number, z: number } {
    return {
      x: Math.floor(worldX / this.chunkSize),
      z: Math.floor(worldZ / this.chunkSize)
    };
  }
  
  public async loadChunksAroundPosition(worldX: number, worldZ: number): Promise<void> {
    const playerChunk = this.getChunkCoordinates(worldX, worldZ);
    
    // Si le joueur est dans le même chunk, ne rien faire
    if (this.lastPlayerChunk && 
        this.lastPlayerChunk.x === playerChunk.x && 
        this.lastPlayerChunk.z === playerChunk.z) {
      return;
    }
    
    console.log(`🔄 Chargement des chunks autour de (${worldX}, ${worldZ}) - Chunk (${playerChunk.x}, ${playerChunk.z})`);
    
    // Décharger les chunks trop éloignés
    await this.unloadDistantChunks(playerChunk);
    
    // Charger les nouveaux chunks
    const chunksToLoad: { x: number, z: number }[] = [];
    for (let x = playerChunk.x - this.chunkRadius; x <= playerChunk.x + this.chunkRadius; x++) {
      for (let z = playerChunk.z - this.chunkRadius; z <= playerChunk.z + this.chunkRadius; z++) {
        const key = this.getChunkKey(x, z);
        if (!this.loadedChunks.has(key)) {
          chunksToLoad.push({ x, z });
        }
      }
    }
    
    // Charger les chunks en parallèle
    const loadPromises = chunksToLoad.map(chunk => this.loadChunk(chunk.x, chunk.z));
    await Promise.all(loadPromises);
    
    this.lastPlayerChunk = playerChunk;
    console.log(`✅ ${chunksToLoad.length} nouveaux chunks chargés. Total: ${this.loadedChunks.size} chunks`);
  }
  
  private async loadChunk(chunkX: number, chunkZ: number): Promise<void> {
    try {
      const response = await fetch(`http://localhost:3002/api/blocks/chunk/${chunkX}/${chunkZ}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const chunkData: ChunkData = await response.json();
      const key = this.getChunkKey(chunkX, chunkZ);
      
      this.loadedChunks.set(key, chunkData);
      this.renderChunk(chunkData);
      
    } catch (error) {
      console.error(`❌ Erreur lors du chargement du chunk (${chunkX}, ${chunkZ}):`, error);
    }
  }
  
  private renderChunk(chunkData: ChunkData): void {
    const key = this.getChunkKey(chunkData.x, chunkData.z);
    
    // Créer un groupe pour ce chunk
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `chunk-${key}`;
    
    // Rendre tous les blocs du chunk
    chunkData.blocks.forEach(blockData => {
      const mesh = this.createBlockMesh(blockData);
      const blockKey = this.getBlockKey(blockData.x, blockData.y, blockData.z);
      
      this.blockMeshes.set(blockKey, mesh);
      chunkGroup.add(mesh);
    });
    
    // Ajouter le groupe à la scène
    this.scene.add(chunkGroup);
    this.chunkGroups.set(key, chunkGroup);
    
    console.log(`🎨 Chunk (${chunkData.x}, ${chunkData.z}) rendu avec ${chunkData.blocks.length} blocs`);
  }
  
  private async unloadDistantChunks(playerChunk: { x: number, z: number }): Promise<void> {
    const chunksToUnload: string[] = [];
    
    for (const [key, chunkData] of this.loadedChunks) {
      const distance = Math.max(
        Math.abs(chunkData.x - playerChunk.x),
        Math.abs(chunkData.z - playerChunk.z)
      );
      
      if (distance > this.chunkRadius) {
        chunksToUnload.push(key);
      }
    }
    
    // Décharger les chunks
    for (const key of chunksToUnload) {
      this.unloadChunk(key);
    }
    
    if (chunksToUnload.length > 0) {
      console.log(`🗑️ ${chunksToUnload.length} chunks déchargés`);
    }
  }
  
  private unloadChunk(key: string): void {
    // Supprimer le groupe de la scène
    const chunkGroup = this.chunkGroups.get(key);
    if (chunkGroup) {
      this.scene.remove(chunkGroup);
      this.chunkGroups.delete(key);
    }
    
    // Supprimer les meshes des blocs
    const chunkData = this.loadedChunks.get(key);
    if (chunkData) {
      chunkData.blocks.forEach(blockData => {
        const blockKey = this.getBlockKey(blockData.x, blockData.y, blockData.z);
        this.blockMeshes.delete(blockKey);
      });
    }
    
    // Supprimer les données du chunk
    this.loadedChunks.delete(key);
  }
  
  public updatePlayerPosition(worldX: number, worldZ: number): void {
    this.loadChunksAroundPosition(worldX, worldZ);
  }

  public getBlockAt(x: number, y: number, z: number): BlockData | null {
    // Chercher dans les chunks chargés
    for (const chunkData of this.loadedChunks.values()) {
      const block = chunkData.blocks.find(block => 
        block.x === x && block.y === y && block.z === z
      );
      if (block) return block;
    }
    
    return null;
  }

  public getBlocksInRange(minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number): BlockData[] {
    const blocks: BlockData[] = [];
    
    // Chercher dans les chunks chargés
    for (const chunkData of this.loadedChunks.values()) {
      const chunkBlocks = chunkData.blocks.filter(block => 
        block.x >= minX && block.x <= maxX &&
        block.y >= minY && block.y <= maxY &&
        block.z >= minZ && block.z <= maxZ
      );
      blocks.push(...chunkBlocks);
    }
    
    return blocks;
  }

  public getWorldBounds(): { minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number } | null {
    if (this.loadedChunks.size === 0) return null;
    
    // Collecter tous les blocs des chunks chargés
    const allBlocks: BlockData[] = [];
    for (const chunkData of this.loadedChunks.values()) {
      allBlocks.push(...chunkData.blocks);
    }
    
    if (allBlocks.length === 0) return null;
    
    return {
      minX: Math.min(...allBlocks.map(b => b.x)),
      maxX: Math.max(...allBlocks.map(b => b.x)),
      minY: Math.min(...allBlocks.map(b => b.y)),
      maxY: Math.max(...allBlocks.map(b => b.y)),
      minZ: Math.min(...allBlocks.map(b => b.z)),
      maxZ: Math.max(...allBlocks.map(b => b.z))
    };
  }

  public getBlockCount(): number {
    let count = 0;
    for (const chunkData of this.loadedChunks.values()) {
      count += chunkData.blocks.length;
    }
    return count;
  }

  public getBlockTypes(): string[] {
    const types = new Set<string>();
    for (const chunkData of this.loadedChunks.values()) {
      chunkData.blocks.forEach(block => types.add(block.type));
    }
    
    return Array.from(types);
  }

  public async regenerateWorld(): Promise<void> {
    try {
      console.log('🔄 Régénération de la map...');
      
      // Afficher un indicateur de chargement
      const mapStatus = document.getElementById('map-status');
      if (mapStatus) {
        mapStatus.textContent = 'Régénération...';
        mapStatus.style.color = '#FFA500';
      }
      
      const response = await fetch('http://localhost:3002/api/blocks/regenerate', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Map régénérée:', result);
      
      // Vider les chunks chargés
      this.loadedChunks.clear();
      this.chunkGroups.clear();
      this.blockMeshes.clear();
      
      // Recharger les chunks autour du spawn
      const spawnPos = await this.getSpawnPosition();
      if (spawnPos) {
        await this.loadChunksAroundPosition(spawnPos.x, spawnPos.z);
      }
      
      // Mettre à jour le statut
      if (mapStatus) {
        const blockCount = this.getBlockCount();
        mapStatus.textContent = `Map régénérée (${this.loadedChunks.size} chunks, ${blockCount.toLocaleString()} blocs visibles)`;
        mapStatus.style.color = '#4CAF50';
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la régénération de la map:', error);
      
      const mapStatus = document.getElementById('map-status');
      if (mapStatus) {
        mapStatus.textContent = 'Erreur de régénération';
        mapStatus.style.color = '#ff4444';
      }
    }
  }

  private createTestWorld(): void {
    console.log('🧪 Création d\'un monde de test amélioré...');
    
    const testBlocks: BlockData[] = [];
    
    // Créer un terrain de test plus varié (15x15x8)
    for (let x = 0; x < 15; x++) {
      for (let z = 0; z < 15; z++) {
        // Simuler différents biomes
        const biome = this.getTestBiome(x, z);
        const height = this.getTestHeight(x, z);
        
        // Couche de bedrock en bas
        testBlocks.push({ x, y: 0, z, type: 'bedrock' });
        
        // Couches souterraines avec minerais
        for (let y = 1; y < height - 2; y++) {
          const blockType = this.getTestUndergroundBlock(x, y, z, height);
          testBlocks.push({ x, y, z, type: blockType });
        }
        
        // Couche de surface
        testBlocks.push({ x, y: height - 2, z, type: 'dirt' });
        testBlocks.push({ x, y: height - 1, z, type: biome.surface });
        
        // Ajouter de la végétation selon le biome
        if (biome.hasVegetation && Math.random() > 0.7) {
          testBlocks.push({ x, y: height, z, type: 'wood' });
          // Ajouter des feuilles autour
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              if (dx === 0 && dz === 0) continue;
              if (Math.random() > 0.5) {
                testBlocks.push({ x: x + dx, y: height + 1, z: z + dz, type: 'leaves' });
              }
            }
          }
        }
      }
    }
    
    // Créer un chunk de test autour de (0,0)
    const testChunk: ChunkData = {
      x: 0,
      z: 0,
      blocks: testBlocks,
      lastUpdated: new Date().toISOString()
    };
    
    this.loadedChunks.set('0,0', testChunk);
    this.renderChunk(testChunk);
    
    console.log(`✅ Monde de test créé avec ${testBlocks.length} blocs`);
  }

  private getTestBiome(x: number, z: number): { surface: string, hasVegetation: boolean } {
    const distance = Math.sqrt((x - 7) ** 2 + (z - 7) ** 2);
    
    if (distance < 3) {
      return { surface: 'grass', hasVegetation: true }; // Forêt centrale
    } else if (distance < 6) {
      return { surface: 'sand', hasVegetation: false }; // Désert
    } else if (distance < 8) {
      return { surface: 'snow', hasVegetation: false }; // Toundra
    } else {
      return { surface: 'stone', hasVegetation: false }; // Montagnes
    }
  }

  private getTestHeight(x: number, z: number): number {
    const centerX = 7;
    const centerZ = 7;
    const distance = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2);
    
    // Créer des collines et vallées
    const baseHeight = 5;
    const hillHeight = Math.max(0, 8 - distance * 0.8);
    const noise = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 2;
    
    return Math.floor(baseHeight + hillHeight + noise);
  }

  private getTestUndergroundBlock(x: number, y: number, z: number, height: number): string {
    const depth = height - y;
    
    // Chance de minerais selon la profondeur
    if (depth > 5 && Math.random() > 0.8) {
      const ores = ['coal', 'iron', 'gold'];
      return ores[Math.floor(Math.random() * ores.length)];
    }
    
    return 'stone';
  }

  public dispose(): void {
    // Nettoyer les matériaux
    this.blockMaterials.forEach(material => {
      material.dispose();
    });
    this.blockMaterials.clear();

    // Nettoyer les meshes
    this.blockMeshes.forEach(mesh => {
      mesh.geometry.dispose();
    });
    this.blockMeshes.clear();

    // Supprimer le groupe de blocs de la scène
    const blocksGroup = this.scene.getObjectByName('blocks');
    if (blocksGroup) {
      this.scene.remove(blocksGroup);
    }
  }
}
