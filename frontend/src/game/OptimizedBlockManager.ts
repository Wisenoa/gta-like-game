import * as THREE from 'three';
import { PhysicsManager } from './PhysicsManager';

export interface BlockFace {
  x: number;
  y: number;
  z: number;
  type: string;
  face: 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';
  vertices: number[];
  normals: number[];
  uvs: number[];
}

export interface Block {
  x: number;
  y: number;
  z: number;
  type: string;
}

export interface Chunk {
  x: number;
  z: number;
  blocks: Block[];
  lastUpdated: string;
}

export interface ChunkFaces {
  x: number;
  z: number;
  faces: BlockFace[];
  lastUpdated: string;
  // Ajouter les données complètes du chunk pour la physique
  blocks?: Block[];
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

export class OptimizedBlockManager {
  private scene: THREE.Scene;
  private blockMaterials: Map<string, THREE.MeshLambertMaterial> = new Map();
  private loadedChunks: Map<string, ChunkFaces> = new Map();
  private chunkGroups: Map<string, THREE.Group> = new Map();
  private chunkRadius: number = 4; // Rayon augmenté car chunks plus petits (16×16)
  private chunkSize: number = 16;
  private lastPlayerChunk: { x: number, z: number } | null = null;
  private spawnPosition: SpawnPosition | null = null;
  private failedChunks: Set<string> = new Set(); // Cache des chunks qui ont échoué
  private lastUpdateTime: number = 0;
  private updateThrottle: number = 1000; // Mettre à jour au maximum toutes les 1 seconde
  
  // Gestionnaire de physique
  private physicsManager: PhysicsManager;
  
  // Position du joueur
  private playerPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private lastLoggedY: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.physicsManager = new PhysicsManager();
    this.initializeMaterials();
  }

  private initializeMaterials(): void {
    const materialConfigs = {
      stone: { color: 0x808080 },
      dirt: { color: 0x8B4513 },
      grass: { color: 0x228B22 },
      sand: { color: 0xF4A460 },
      water: { color: 0x006994, transparent: true, opacity: 0.8 },
      bedrock: { color: 0x1C1C1C },
      wood: { color: 0x8B4513 },
      leaves: { color: 0x32CD32 },
      snow: { color: 0xFFFFFF },
      ice: { color: 0x87CEEB, transparent: true, opacity: 0.9 },
      clay: { color: 0xCD853F },
      gravel: { color: 0x696969 },
      coal: { color: 0x2F2F2F },
      iron: { color: 0xCD853F },
      gold: { color: 0xFFD700 },
      diamond: { color: 0x00FFFF },
      road: { color: 0x404040 },
      building_wall: { color: 0x8B7355 },
      building_floor: { color: 0xD2B48C },
      building_roof: { color: 0x8B0000 },
      glass: { color: 0x87CEEB, transparent: true, opacity: 0.3 },
      door: { color: 0x8B4513 },
      window: { color: 0x87CEEB, transparent: true, opacity: 0.5 }
    };

    for (const [type, config] of Object.entries(materialConfigs)) {
      this.blockMaterials.set(type, new THREE.MeshLambertMaterial(config));
    }
  }

  public async loadWorldData(): Promise<void> {
    try {
      console.log('🌍 Chargement optimisé des données du monde...');
      
      const spawnPos = await this.getSpawnPosition();
      if (spawnPos) {
        await this.loadChunksAroundPosition(spawnPos.x, spawnPos.z);
      } else {
        await this.loadChunksAroundPosition(0, 0);
      }
      
      console.log(`✅ Monde optimisé chargé avec ${this.loadedChunks.size} chunks`);
    } catch (error) {
      console.error('❌ Erreur lors du chargement du monde:', error);
      console.log('🧪 Utilisation du monde de test...');
      this.createTestWorld();
    }
    
    // TOUJOURS créer le monde de test pour debug
    console.log('🧪 Création du monde de test pour debug...');
    this.createTestWorld();
  }

  public async getSpawnPosition(): Promise<SpawnPosition | null> {
    if (this.spawnPosition) {
      console.log(`🔄 Position de spawn en cache: (${this.spawnPosition.x}, ${this.spawnPosition.y}, ${this.spawnPosition.z})`);
      return this.spawnPosition;
    }
    
    try {
      console.log('🎯 Recherche d\'une position de spawn en hauteur...');
      
      // Essayer plusieurs positions pour trouver un spawn en hauteur
      const spawnCandidates = [
        { x: 0, z: 0 },      // Centre de la ville
        { x: 8, z: 8 },      // Près du centre
        { x: -8, z: -8 },    // Près du centre
        { x: 16, z: 16 },    // Zone urbaine
        { x: -16, z: -16 },  // Zone urbaine
        { x: 32, z: 0 },     // Zone urbaine
        { x: 0, z: 32 },     // Zone urbaine
        { x: -32, z: 0 },    // Zone urbaine
        { x: 0, z: -32 },    // Zone urbaine
        { x: 48, z: 48 },    // Zone urbaine
        { x: -48, z: -48 }   // Zone urbaine
      ];
      
      // Utiliser une position de spawn fixe au centre de la ville
      // Le terrain de la ville est à Y=10, donc spawn TRÈS HAUT pour éviter les problèmes
      const spawnPos: SpawnPosition = {
        x: 0,
        y: 50, // Spawn TRÈS HAUT pour éviter de tomber sous le terrain
        z: 0
      };
      
      this.spawnPosition = spawnPos;
      console.log(`✅ Position de spawn fixe définie: (${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z})`);
      return spawnPos;
      
    } catch (error) {
      console.error('❌ Erreur lors de la recherche de position de spawn:', error);
      return null;
    }
  }

  // === SYSTÈME DE CHUNKS OPTIMISÉ ===
  
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
    
    if (this.lastPlayerChunk && 
        this.lastPlayerChunk.x === playerChunk.x && 
        this.lastPlayerChunk.z === playerChunk.z) {
      return;
    }
    
    await this.unloadDistantChunks(playerChunk.x, playerChunk.z);
    
    const chunksToLoad: { x: number, z: number }[] = [];
    for (let x = playerChunk.x - this.chunkRadius; x <= playerChunk.x + this.chunkRadius; x++) {
      for (let z = playerChunk.z - this.chunkRadius; z <= playerChunk.z + this.chunkRadius; z++) {
        const key = this.getChunkKey(x, z);
        if (!this.loadedChunks.has(key)) {
          chunksToLoad.push({ x, z });
        }
      }
    }
    
    // Charger les chunks en cercles concentriques (plus proche en premier)
    const chunksByDistance = new Map<number, { x: number, z: number }[]>();
    
    for (const chunk of chunksToLoad) {
      const distance = Math.sqrt((chunk.x - playerChunk.x) ** 2 + (chunk.z - playerChunk.z) ** 2);
      if (!chunksByDistance.has(distance)) {
        chunksByDistance.set(distance, []);
      }
      chunksByDistance.get(distance)!.push(chunk);
    }
    
    // Trier les distances (plus proche en premier)
    const sortedDistances = Array.from(chunksByDistance.keys()).sort((a, b) => a - b);
    
    // Charger chaque cercle de chunks
    for (const distance of sortedDistances) {
      const chunksAtDistance = chunksByDistance.get(distance)!;
      // Charger les chunks de ce cercle par batches
      const batchSize = 4;
      for (let i = 0; i < chunksAtDistance.length; i += batchSize) {
        const batch = chunksAtDistance.slice(i, i + batchSize);
        const loadPromises = batch.map(chunk => this.loadChunkFaces(chunk.x, chunk.z));
        await Promise.all(loadPromises);
        
        // Petite pause entre les batches
        if (i + batchSize < chunksAtDistance.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Pause plus longue entre les cercles pour laisser le temps au rendu
      if (distance < sortedDistances[sortedDistances.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.lastPlayerChunk = playerChunk;
    console.log(`✅ ${chunksToLoad.length} nouveaux chunks optimisés chargés. Total: ${this.loadedChunks.size} chunks`);
  }
  
  public async loadChunkFaces(chunkX: number, chunkZ: number): Promise<void> {
    const key = this.getChunkKey(chunkX, chunkZ);
    
    // Éviter de recharger les chunks qui ont échoué récemment
    if (this.failedChunks.has(key)) {
      return;
    }
    
    const startTime = performance.now();
    
    try {
      const fetchStart = performance.now();
      const response = await fetch(`http://localhost:3002/api/blocks/chunk/${chunkX}/${chunkZ}`);
      const fetchTime = performance.now() - fetchStart;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const parseStart = performance.now();
      const chunk: Chunk = await response.json();
      const parseTime = performance.now() - parseStart;
      
      const facesStart = performance.now();
      const faces = this.processChunkFaces(chunk);
      const facesTime = performance.now() - facesStart;
      
      const chunkFaces: ChunkFaces = {
        x: chunkX,
        z: chunkZ,
        faces,
        lastUpdated: new Date().toISOString(),
        blocks: chunk.blocks // Stocker les blocs pour la physique
      };
      

      
      this.loadedChunks.set(key, chunkFaces);
      
      const renderStart = performance.now();
      this.renderChunkFaces(chunkFaces);
      const renderTime = performance.now() - renderStart;
      
      const totalTime = performance.now() - startTime;
      
      // Retirer du cache des échecs si le chargement réussit
      this.failedChunks.delete(key);
      
    } catch (error) {
      console.error(`❌ Erreur lors du chargement du chunk (${chunkX}, ${chunkZ}):`, error);
      // Ajouter au cache des échecs pour éviter les tentatives répétées
      this.failedChunks.add(key);
      // Ne pas faire échouer tout le chargement pour un chunk
    }
  }
  
  // Traiter les faces d'un chunk (face culling côté frontend optimisé)
  private processChunkFaces(chunk: Chunk): BlockFace[] {
    const startTime = performance.now();
    const faces: BlockFace[] = [];
    
    // Créer une Map pour un accès O(1) aux blocs
    const blockMap = new Map<string, Block>();
    for (const block of chunk.blocks) {
      const key = `${block.x},${block.y},${block.z}`;
      blockMap.set(key, block);
    }
    
    const mapTime = performance.now() - startTime;
    // Parcourir seulement les blocs solides
    const solidBlocks = chunk.blocks.filter(block => block.type !== 'air');
    
    const faceStart = performance.now();
    
    // Vérifier chaque face du bloc
    const facesToCheck = [
      { face: 'top' as const, dx: 0, dy: 1, dz: 0 },
      { face: 'bottom' as const, dx: 0, dy: -1, dz: 0 },
      { face: 'north' as const, dx: 0, dy: 0, dz: -1 },
      { face: 'south' as const, dx: 0, dy: 0, dz: 1 },
      { face: 'east' as const, dx: 1, dy: 0, dz: 0 },
      { face: 'west' as const, dx: -1, dy: 0, dz: 0 }
    ];
    
    for (const block of solidBlocks) {
      for (const { face, dx, dy, dz } of facesToCheck) {
        const neighborX = block.x + dx;
        const neighborY = block.y + dy;
        const neighborZ = block.z + dz;
        
        // Vérifier si la face est visible (accès O(1))
        const neighborKey = `${neighborX},${neighborY},${neighborZ}`;
        const neighborBlock = blockMap.get(neighborKey);
        
        // La face est visible si le voisin est AIR ou n'existe pas
        if (!neighborBlock || neighborBlock.type === 'air') {
          // Cette face est visible
          const faceData = this.generateBlockFace(block, face);
          faces.push(faceData);
        }
      }
    }
    
    const faceTime = performance.now() - faceStart;
    const totalTime = performance.now() - startTime;
    
    return faces;
  }
  
  // Obtenir un bloc dans un chunk
  private getBlockInChunk(chunk: Chunk, x: number, y: number, z: number): Block | null {
    return chunk.blocks.find(
      block => block.x === x && block.y === y && block.z === z
    ) || null;
  }
  
  // Générer la géométrie d'une face de bloc (optimisé)
  private generateBlockFace(block: Block, face: 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west'): BlockFace {
    const x = block.x;
    const y = block.y;
    const z = block.z;
    
    // Calculer les vertices directement (éviter les objets intermédiaires)
    let vertices: number[];
    let normals: number[];
    
    switch (face) {
      case 'top':
        vertices = [x, y + 1, z, x, y + 1, z + 1, x + 1, y + 1, z + 1, x + 1, y + 1, z];
        normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
        break;
      case 'bottom':
        vertices = [x, y, z, x, y, z + 1, x + 1, y, z + 1, x + 1, y, z];
        normals = [0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0];
        break;
      case 'north':
        vertices = [x, y, z, x, y + 1, z, x + 1, y + 1, z, x + 1, y, z];
        normals = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
        break;
      case 'south':
        vertices = [x + 1, y, z + 1, x + 1, y + 1, z + 1, x, y + 1, z + 1, x, y, z + 1];
        normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
        break;
      case 'east':
        vertices = [x + 1, y, z, x + 1, y + 1, z, x + 1, y + 1, z + 1, x + 1, y, z + 1];
        normals = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
        break;
      case 'west':
        vertices = [x, y, z + 1, x, y + 1, z + 1, x, y + 1, z, x, y, z];
        normals = [-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0];
        break;
    }
    
    // UVs constants pour toutes les faces
    const uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    
    return {
      x: x,
      y: y,
      z: z,
      type: block.type,
      face: face,
      vertices: vertices,
      normals: normals,
      uvs: uvs
    };
  }
  
  private renderChunkFaces(chunkFaces: ChunkFaces): void {
    const key = this.getChunkKey(chunkFaces.x, chunkFaces.z);
    
    // Créer un groupe pour ce chunk
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `chunk-${key}`;
    
    // Grouper les faces par type de bloc pour optimiser le rendu
    const facesByType = new Map<string, BlockFace[]>();
    
    for (const face of chunkFaces.faces) {
      if (!facesByType.has(face.type)) {
        facesByType.set(face.type, []);
      }
      facesByType.get(face.type)!.push(face);
    }
    
    // Debug: compter les faces par type
    const faceCounts = Array.from(facesByType.entries()).map(([type, faces]) => ({
      type,
      count: faces.length,
      faces: faces.map(f => f.face)
    }));
    
    // Créer un mesh par type de bloc avec toutes ses faces
    for (const [blockType, faces] of facesByType) {
      const material = this.blockMaterials.get(blockType);
      if (!material) {
        console.warn(`Matériau manquant pour le type de bloc: ${blockType}`);
        continue;
      }
      
      
      const geometry = new THREE.BufferGeometry();
      
      const vertices: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      
      let vertexIndex = 0;
      
      for (const face of faces) {
        // Ajouter les vertices
        vertices.push(...face.vertices);
        
        // Ajouter les normales
        normals.push(...face.normals);
        
        // Ajouter les UVs
        uvs.push(...face.uvs);
        
        // Ajouter les indices pour former des triangles
        indices.push(
          vertexIndex, vertexIndex + 1, vertexIndex + 2,
          vertexIndex, vertexIndex + 2, vertexIndex + 3
        );
        
        vertexIndex += 4;
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      chunkGroup.add(mesh);
    }
    
    this.scene.add(chunkGroup);
    this.chunkGroups.set(key, chunkGroup);
    
  }
  
  public updatePlayerPosition(worldX: number, worldZ: number): void {
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateThrottle) {
      return; // Throttle les mises à jour
    }
    
    // Calculer le chunk du joueur
    const playerChunk = {
      x: Math.floor(worldX / this.chunkSize),
      z: Math.floor(worldZ / this.chunkSize)
    };
    
    // Vérifier si le joueur a vraiment changé de chunk
    if (this.lastPlayerChunk && 
        this.lastPlayerChunk.x === playerChunk.x && 
        this.lastPlayerChunk.z === playerChunk.z) {
      return; // Pas de changement de chunk, pas besoin de recharger
    }
    
    this.lastUpdateTime = now;
    
    // Délai pour éviter le chargement immédiat
    setTimeout(() => {
      this.loadChunksAroundPosition(worldX, worldZ);
    }, 100);
  }

  public getBlockCount(): number {
    let count = 0;
    for (const chunkFaces of this.loadedChunks.values()) {
      count += chunkFaces.faces.length;
    }
    return count;
  }

  public getWorldBounds(): { minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number } | null {
    if (this.loadedChunks.size === 0) return null;
    
    const allFaces: BlockFace[] = [];
    for (const chunkFaces of this.loadedChunks.values()) {
      allFaces.push(...chunkFaces.faces);
    }
    
    if (allFaces.length === 0) return null;
    
    return {
      minX: Math.min(...allFaces.map(f => f.x)),
      maxX: Math.max(...allFaces.map(f => f.x)),
      minY: Math.min(...allFaces.map(f => f.y)),
      maxY: Math.max(...allFaces.map(f => f.y)),
      minZ: Math.min(...allFaces.map(f => f.z)),
      maxZ: Math.max(...allFaces.map(f => f.z))
    };
  }

  public async regenerateWorld(): Promise<void> {
    try {
      console.log('🔄 Régénération optimisée de la map...');
      
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
      
      // Recharger les chunks autour du spawn
      const spawnPos = await this.getSpawnPosition();
      if (spawnPos) {
        await this.loadChunksAroundPosition(spawnPos.x, spawnPos.z);
      }
      
      if (mapStatus) {
        const faceCount = this.getBlockCount();
        mapStatus.textContent = `Map optimisée régénérée (${this.loadedChunks.size} chunks, ${faceCount.toLocaleString()} faces visibles)`;
        mapStatus.style.color = '#4CAF50';
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la régénération:', error);
      
      const mapStatus = document.getElementById('map-status');
      if (mapStatus) {
        mapStatus.textContent = 'Erreur de régénération';
        mapStatus.style.color = '#ff4444';
      }
    }
  }

  private createTestWorld(): void {
    
    // Créer quelques faces de test avec spawn urbain
    const testFaces: BlockFace[] = [
      // Plateforme de spawn urbaine
      {
        x: 0, y: 10, z: 0, type: 'stone', face: 'top',
        vertices: [0, 11, 0, 1, 11, 0, 1, 11, 1, 0, 11, 1],
        normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        uvs: [0, 0, 1, 0, 1, 1, 0, 1]
      },
      {
        x: 1, y: 10, z: 0, type: 'stone', face: 'top',
        vertices: [1, 11, 0, 2, 11, 0, 2, 11, 1, 1, 11, 1],
        normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        uvs: [0, 0, 1, 0, 1, 1, 0, 1]
      },
      {
        x: 0, y: 10, z: 1, type: 'stone', face: 'top',
        vertices: [0, 11, 1, 1, 11, 1, 1, 11, 2, 0, 11, 2],
        normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        uvs: [0, 0, 1, 0, 1, 1, 0, 1]
      },
      {
        x: 1, y: 10, z: 1, type: 'stone', face: 'top',
        vertices: [1, 11, 1, 2, 11, 1, 2, 11, 2, 1, 11, 2],
        normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        uvs: [0, 0, 1, 0, 1, 1, 0, 1]
      },
      // Terrain de référence en bas
      {
        x: 0, y: 0, z: 0, type: 'grass', face: 'top',
        vertices: [0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1],
        normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        uvs: [0, 0, 1, 0, 1, 1, 0, 1]
      }
    ];
    
    const testChunk: ChunkFaces = {
      x: 0,
      z: 0,
      faces: testFaces,
      lastUpdated: new Date().toISOString(),
      blocks: [
        // Blocs de sol à Y=10 pour la physique
        { x: 0, y: 10, z: 0, type: 'stone' },
        { x: 1, y: 10, z: 0, type: 'stone' },
        { x: 0, y: 10, z: 1, type: 'stone' },
        { x: 1, y: 10, z: 1, type: 'stone' },
        { x: -1, y: 10, z: 0, type: 'stone' },
        { x: 0, y: 10, z: -1, type: 'stone' },
        { x: -1, y: 10, z: -1, type: 'stone' },
        { x: 1, y: 10, z: -1, type: 'stone' },
        { x: -1, y: 10, z: 1, type: 'stone' }
      ]
    };
    
    this.loadedChunks.set('0,0', testChunk);
    this.renderChunkFaces(testChunk);
    
    
    // Vérifier que le chunk est bien dans loadedChunks
    const chunk = this.loadedChunks.get('0,0');
    
    // Définir la position de spawn urbaine TRÈS HAUTE
    this.spawnPosition = {
      x: 0.5,
      y: 50, // Spawn TRÈS HAUT pour éviter de tomber sous le terrain
      z: 0.5
    };
    
  }

  // Mettre à jour la physique du joueur
  updatePhysics(deltaTime: number): void {
    // Vérifier que le chunk du joueur est chargé avant de permettre le mouvement
    const playerChunkX = Math.floor(this.playerPosition.x / this.chunkSize);
    const playerChunkZ = Math.floor(this.playerPosition.z / this.chunkSize);
    const playerChunkKey = this.getChunkKey(playerChunkX, playerChunkZ);
    
    if (!this.loadedChunks.has(playerChunkKey)) {
      return; // Ne pas mettre à jour la physique tant que le chunk n'est pas chargé
    }
    
    // Mettre à jour la physique
    this.physicsManager.update(deltaTime, this.getBlockAt.bind(this));
    
    // Mettre à jour la position du joueur
    const newPosition = this.physicsManager.getPosition();
    this.playerPosition.copy(newPosition);
    
    
    // Vérifier si on doit charger/décharger des chunks
    this.updateChunkLoading();
  }
  
  // Mettre à jour le chargement des chunks
  private updateChunkLoading(): void {
    const currentTime = Date.now();
    
    // Throttling pour éviter les appels trop fréquents
    if (currentTime - this.lastUpdateTime < this.updateThrottle) {
      return;
    }
    
    this.lastUpdateTime = currentTime;
    
    // Calculer la position du chunk du joueur
    const playerChunkX = Math.floor(this.playerPosition.x / this.chunkSize);
    const playerChunkZ = Math.floor(this.playerPosition.z / this.chunkSize);
    
    // Vérifier si le joueur a changé de chunk
    if (!this.lastPlayerChunk || 
        this.lastPlayerChunk.x !== playerChunkX || 
        this.lastPlayerChunk.z !== playerChunkZ) {
      
      this.lastPlayerChunk = { x: playerChunkX, z: playerChunkZ };
      
      // Charger les chunks autour du joueur EN PREMIER
      this.loadChunksAroundPlayer(playerChunkX, playerChunkZ);
      
      // Décharger les chunks trop éloignés EN SECOND
      this.unloadDistantChunks(playerChunkX, playerChunkZ);
    }
  }
  
  // Charger les chunks autour du joueur
  private loadChunksAroundPlayer(centerX: number, centerZ: number): void {
    const chunksToLoad: { x: number, z: number }[] = [];
    
    // Générer la liste des chunks à charger
    for (let x = centerX - this.chunkRadius; x <= centerX + this.chunkRadius; x++) {
      for (let z = centerZ - this.chunkRadius; z <= centerZ + this.chunkRadius; z++) {
        const key = this.getChunkKey(x, z);
        
        // Vérifier si le chunk n'est pas déjà chargé ou en cours de chargement
        if (!this.loadedChunks.has(key) && !this.failedChunks.has(key)) {
          chunksToLoad.push({ x, z });
        }
      }
    }
    
    if (chunksToLoad.length > 0) {
      // Charger les chunks par batch
      this.loadChunksBatch(chunksToLoad);
    }
  }
  
  // Décharger les chunks trop éloignés
  private unloadDistantChunks(centerX: number, centerZ: number): void {
    const chunksToUnload: string[] = [];
    
    for (const [key, chunk] of this.loadedChunks) {
      const distance = Math.max(
        Math.abs(chunk.x - centerX),
        Math.abs(chunk.z - centerZ)
      );
      
      if (distance > this.chunkRadius + 2) {
        chunksToUnload.push(key);
      }
    }
    
    if (chunksToUnload.length > 0) {
    }
    
    // Décharger les chunks
    for (const key of chunksToUnload) {
      this.unloadChunk(key);
    }
  }
  
  // Charger un batch de chunks
  private async loadChunksBatch(chunks: { x: number, z: number }[]): Promise<void> {
    const batchSize = 2; // Limiter le nombre de chunks par batch
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Charger les chunks du batch en parallèle
      const promises = batch.map(chunk => this.loadChunkFaces(chunk.x, chunk.z));
      await Promise.allSettled(promises);
      
      // Pause entre les batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  // Décharger un chunk
  private unloadChunk(key: string): void {
    const chunkGroup = this.chunkGroups.get(key);
    if (chunkGroup) {
      this.scene.remove(chunkGroup);
      
      // Disposer de la géométrie pour libérer la mémoire
      chunkGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
      
      this.chunkGroups.delete(key);
    }
    
    this.loadedChunks.delete(key);
  }
  
  // Obtenir la hauteur du sol à une position
  private getGroundHeight(x: number, z: number): number {
    // Chercher le premier bloc solide en descendant depuis une hauteur raisonnable
    for (let y = 50; y >= -100; y--) {
      const block = this.getBlockAt(Math.floor(x), y, Math.floor(z));
      if (block && block !== 'air') {
        return y;
      }
    }
    return -100;
  }
  
  // Obtenir la hauteur maximale du terrain dans une zone
  private getMaxTerrainHeight(centerX: number, centerZ: number, radius: number = 10): number {
    let maxHeight = -100;
    
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let z = centerZ - radius; z <= centerZ + radius; z++) {
        const height = this.getGroundHeight(x, z);
        if (height > maxHeight) {
          maxHeight = height;
        }
      }
    }
    
    return maxHeight;
  }
  
  // Obtenir le chunk du joueur
  private getPlayerChunk(): { x: number, z: number } {
    return {
      x: Math.floor(this.playerPosition.x / this.chunkSize),
      z: Math.floor(this.playerPosition.z / this.chunkSize)
    };
  }

    // Obtenir le type de bloc à une position (pour la physique) - OPTIMISÉ
    private getBlockAt(x: number, y: number, z: number): string | null {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        const chunkKey = this.getChunkKey(chunkX, chunkZ);
        
        const chunk = this.loadedChunks.get(chunkKey);
        if (!chunk) {
            return null; // Chunk non chargé
        }
        
        // Convertir en coordonnées entières pour la recherche
        const blockX = Math.floor(x);
        const blockY = Math.floor(y);
        const blockZ = Math.floor(z);
        
        // Chercher dans les faces uniquement (pas de blocks stockés)
        if (chunk.faces && chunk.faces.length > 0) {
            for (const face of chunk.faces) {
                if (face.x === blockX && face.y === blockY && face.z === blockZ) {
                    return face.type;
                }
            }
        }
        
        // Si pas de bloc trouvé, c'est de l'air
        return 'air';
    }
  
  // Mettre à jour les entrées du joueur
  updatePlayerInput(input: {
    forward?: boolean;
    backward?: boolean;
    left?: boolean;
    right?: boolean;
    jump?: boolean;
    run?: boolean;
  }): void {
    this.physicsManager.updateInput(input);
  }
  
  // Obtenir la position du joueur
  getPlayerPosition(): THREE.Vector3 {
    const pos = this.physicsManager.getPosition();
    return pos;
  }
  
  // Obtenir la vélocité du joueur
  getPlayerVelocity(): THREE.Vector3 {
    return this.physicsManager.getVelocity();
  }
  
  // Vérifier si le joueur est au sol
  isPlayerOnGround(): boolean {
    return this.physicsManager.isOnGround();
  }
  
  // Vérifier si le joueur court
  isPlayerRunning(): boolean {
    return this.physicsManager.isRunning();
  }
  
  // Définir la position du joueur
  setPlayerPosition(position: THREE.Vector3): void {
    this.physicsManager.setPosition(position);
    this.playerPosition.copy(position);
  }

  public dispose(): void {
    // Disposer de tous les matériaux
    for (const material of this.blockMaterials.values()) {
      material.dispose();
    }
    
    // Disposer de tous les groupes de chunks
    for (const chunkGroup of this.chunkGroups.values()) {
      chunkGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
    }
  }
}

