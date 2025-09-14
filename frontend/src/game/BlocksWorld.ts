import * as THREE from "three";
import { BlocksManager, WorldData, Chunk } from "./BlocksManager";

export class BlocksWorld {
  private scene: THREE.Scene;
  private blocksManager: BlocksManager;
  private worldData: WorldData | null = null;
  private isWorldLoaded = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.blocksManager = new BlocksManager(scene);
    console.log("🌍 Monde de blocs initialisé");
  }

  // Charger les données du monde depuis le serveur
  public async loadWorldFromServer(): Promise<void> {
    try {
      console.log("🌍 Chargement du monde de blocs depuis le serveur...");
      
      const response = await fetch('http://localhost:3002/api/blocks/world');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const worldData: WorldData = await response.json();
      this.worldData = worldData;
      
      // Charger les chunks dans le gestionnaire de blocs
      this.blocksManager.loadChunks(worldData);
      
      this.isWorldLoaded = true;
      console.log(`✅ Monde chargé: ${worldData.chunks.length} chunks, seed: ${worldData.seed}`);
      
    } catch (error) {
      console.error("❌ Erreur lors du chargement du monde:", error);
      throw error;
    }
  }

  // Charger des chunks autour d'une position
  public async loadChunksAroundPosition(x: number, z: number, radius: number = 2): Promise<void> {
    try {
      console.log(`🧱 Chargement des chunks autour de (${x}, ${z}) avec rayon ${radius}...`);
      
      const response = await fetch(
        `http://localhost:3002/api/blocks/chunks-around?x=${x}&z=${z}&radius=${radius}`
      );
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const chunks: Chunk[] = await response.json();
      
      // Charger les nouveaux chunks
      chunks.forEach(chunk => {
        this.blocksManager.loadChunks({ 
          chunks: [chunk], 
          seed: 0, 
          version: '1.0.0', 
          generatedAt: new Date().toISOString() 
        });
      });
      
      console.log(`✅ ${chunks.length} chunks chargés autour de (${x}, ${z})`);
      
    } catch (error) {
      console.error("❌ Erreur lors du chargement des chunks:", error);
      throw error;
    }
  }

  // Régénérer le monde
  public async regenerateWorld(): Promise<void> {
    try {
      console.log("🔄 Régénération du monde de blocs...");
      
      const response = await fetch('http://localhost:3002/api/blocks/regenerate', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("✅ Monde régénéré:", result);
      
      // Recharger le monde
      await this.loadWorldFromServer();
      
    } catch (error) {
      console.error("❌ Erreur lors de la régénération:", error);
      throw error;
    }
  }

  // Obtenir un bloc à une position donnée
  public getBlockAt(x: number, y: number, z: number): THREE.Mesh | null {
    return this.blocksManager.getBlockAt(x, y, z);
  }

  // Obtenir tous les blocs dans un rayon
  public getBlocksInRadius(centerX: number, centerY: number, centerZ: number, radius: number): THREE.Mesh[] {
    return this.blocksManager.getBlocksInRadius(centerX, centerY, centerZ, radius);
  }

  // Mettre à jour un bloc
  public updateBlock(x: number, y: number, z: number, newType: string): void {
    this.blocksManager.updateBlock(x, y, z, newType as any);
  }

  // Obtenir les statistiques du monde
  public getWorldStats() {
    return this.blocksManager.getWorldStats();
  }

  // Vérifier si le monde est chargé
  public isLoaded(): boolean {
    return this.isWorldLoaded;
  }

  // Obtenir les données du monde
  public getWorldData(): WorldData | null {
    return this.worldData;
  }

  // Nettoyer le monde
  public clearWorld(): void {
    this.blocksManager.loadChunks({ 
      chunks: [], 
      seed: 0, 
      version: '1.0.0', 
      generatedAt: new Date().toISOString() 
    });
    this.isWorldLoaded = false;
    this.worldData = null;
    console.log("🗑️ Monde nettoyé");
  }

  // Obtenir la hauteur du terrain à une position
  public getTerrainHeight(x: number, z: number): number {
    // Chercher le bloc le plus haut à cette position
    let maxHeight = 0;
    
    for (let y = 0; y < 64; y++) {
      const block = this.getBlockAt(x, y, z);
      if (block && block.userData.blockType !== 'air') {
        maxHeight = Math.max(maxHeight, y);
      }
    }
    
    return maxHeight;
  }

  // Vérifier si une position est libre (pas de bloc)
  public isPositionFree(x: number, y: number, z: number): boolean {
    const block = this.getBlockAt(x, y, z);
    return !block || block.userData.blockType === 'air';
  }

  // Obtenir le type de bloc à une position
  public getBlockType(x: number, y: number, z: number): string {
    const block = this.getBlockAt(x, y, z);
    return block ? block.userData.blockType : 'air';
  }
}
