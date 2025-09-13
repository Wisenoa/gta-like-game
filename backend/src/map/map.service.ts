import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MapElement {
  type: 'building' | 'road' | 'tree' | 'lamp' | 'car';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color?: string;
  metadata?: any;
}

export interface MapData {
  elements: MapElement[];
  seed: number;
  version: string;
  generatedAt: string;
}

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);
  private mapData: MapData | null = null;
  private readonly mapSeed = 12345; // Seed fixe pour la cohérence

  constructor(private readonly prisma: PrismaService) {
    // L'initialisation sera faite de manière asynchrone
    this.initializeMap().catch(error => {
      this.logger.error('❌ Erreur critique lors de l\'initialisation:', error);
    });
  }

  private async initializeMap(): Promise<void> {
    try {
      // Vérifier si une carte existe déjà
      const existingMap = await this.prisma.map.findFirst({
        where: { name: 'main_map' }
      });

      if (existingMap) {
        this.logger.log('🗺️ Carte existante trouvée, chargement...');
        this.mapData = {
          elements: existingMap.elements as unknown as MapElement[],
          seed: existingMap.seed,
          version: existingMap.version,
          generatedAt: existingMap.createdAt.toISOString(),
        };
      } else {
        this.logger.log('🗺️ Aucune carte trouvée, génération...');
        await this.generateAndSaveMap();
      }
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'initialisation de la carte:', error);
      // Fallback vers la génération en mémoire
      this.generateMap();
    }
  }

  private async generateAndSaveMap(): Promise<void> {
    this.generateMap();
    
    if (this.mapData) {
      try {
        await this.prisma.map.create({
          data: {
            name: 'main_map',
            seed: this.mapData.seed,
            version: this.mapData.version,
            elements: this.mapData.elements as any,
          }
        });
        this.logger.log('✅ Carte sauvegardée en base de données');
      } catch (error) {
        this.logger.error('❌ Erreur lors de la sauvegarde de la carte:', error);
      }
    }
  }

  private generateMap(): void {
    this.logger.log('🗺️ Génération de la carte côté serveur...');
    
    const elements: MapElement[] = [];
    
    // Générer les routes principales
    this.generateRoads(elements);
    
    // Générer les bâtiments
    this.generateBuildings(elements);
    
    // Générer les arbres
    this.generateTrees(elements);
    
    // Générer les lampadaires
    this.generateLamps(elements);
    
    // Générer quelques voitures
    this.generateCars(elements);

    this.mapData = {
      elements,
      seed: this.mapSeed,
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
    };

    this.logger.log(`✅ Carte générée avec ${elements.length} éléments`);
  }

  private generateRoads(elements: MapElement[]): void {
    // Route principale horizontale
    for (let x = -50; x <= 50; x += 2) {
      elements.push({
        type: 'road',
        position: { x, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 2, y: 0.1, z: 0.5 },
        color: '#333333',
      });
    }

    // Route principale verticale
    for (let z = -50; z <= 50; z += 2) {
      elements.push({
        type: 'road',
        position: { x: 0, y: 0, z },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        scale: { x: 2, y: 0.1, z: 0.5 },
        color: '#333333',
      });
    }

    // Routes secondaires
    for (let x = -40; x <= 40; x += 20) {
      for (let z = -40; z <= 40; z += 20) {
        if (x !== 0 && z !== 0) {
          // Route horizontale
          for (let i = -8; i <= 8; i += 2) {
            elements.push({
              type: 'road',
              position: { x: x + i, y: 0, z },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1.5, y: 0.1, z: 0.4 },
              color: '#444444',
            });
          }
          // Route verticale
          for (let i = -8; i <= 8; i += 2) {
            elements.push({
              type: 'road',
              position: { x, y: 0, z: z + i },
              rotation: { x: 0, y: Math.PI / 2, z: 0 },
              scale: { x: 1.5, y: 0.1, z: 0.4 },
              color: '#444444',
            });
          }
        }
      }
    }
  }

  private generateBuildings(elements: MapElement[]): void {
    const buildingPositions = [
      { x: -30, z: -30 }, { x: -30, z: 30 }, { x: 30, z: -30 }, { x: 30, z: 30 },
      { x: -20, z: -20 }, { x: -20, z: 20 }, { x: 20, z: -20 }, { x: 20, z: 20 },
      { x: -15, z: -15 }, { x: -15, z: 15 }, { x: 15, z: -15 }, { x: 15, z: 15 },
    ];

    buildingPositions.forEach((pos, index) => {
      const height = 3 + Math.random() * 4;
      const width = 2 + Math.random() * 2;
      const depth = 2 + Math.random() * 2;
      
      elements.push({
        type: 'building',
        position: { x: pos.x, y: height / 2, z: pos.z },
        rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
        scale: { x: width, y: height, z: depth },
        color: `hsl(${200 + Math.random() * 60}, 50%, ${30 + Math.random() * 20}%)`,
        metadata: { floors: Math.floor(height) },
      });
    });
  }

  private generateTrees(elements: MapElement[]): void {
    for (let i = 0; i < 50; i++) {
      let x, z;
      let attempts = 0;
      
      do {
        x = (Math.random() - 0.5) * 80;
        z = (Math.random() - 0.5) * 80;
        attempts++;
      } while (this.isNearRoad(x, z) && attempts < 10);

      if (!this.isNearRoad(x, z)) {
        elements.push({
          type: 'tree',
          position: { x, y: 1, z },
          rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
          scale: { x: 1, y: 1 + Math.random() * 0.5, z: 1 },
          color: '#2d5016',
        });
      }
    }
  }

  private generateLamps(elements: MapElement[]): void {
    // Lampadaires le long des routes principales
    for (let x = -50; x <= 50; x += 10) {
      elements.push({
        type: 'lamp',
        position: { x, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.1, y: 2, z: 0.1 },
        color: '#666666',
      });
      elements.push({
        type: 'lamp',
        position: { x, y: 2, z: -3 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.1, y: 2, z: 0.1 },
        color: '#666666',
      });
    }

    for (let z = -50; z <= 50; z += 10) {
      elements.push({
        type: 'lamp',
        position: { x: 3, y: 2, z },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        scale: { x: 0.1, y: 2, z: 0.1 },
        color: '#666666',
      });
      elements.push({
        type: 'lamp',
        position: { x: -3, y: 2, z },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        scale: { x: 0.1, y: 2, z: 0.1 },
        color: '#666666',
      });
    }
  }

  private generateCars(elements: MapElement[]): void {
    const carPositions = [
      { x: -25, z: 0 }, { x: 25, z: 0 }, { x: 0, z: -25 }, { x: 0, z: 25 },
      { x: -15, z: -15 }, { x: 15, z: 15 }, { x: -15, z: 15 }, { x: 15, z: -15 },
    ];

    carPositions.forEach((pos, index) => {
      elements.push({
        type: 'car',
        position: { x: pos.x, y: 0.5, z: pos.z },
        rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
        scale: { x: 1, y: 0.5, z: 2 },
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        metadata: { model: `car_${index + 1}` },
      });
    });
  }

  private isNearRoad(x: number, z: number): boolean {
    // Vérifier si la position est proche d'une route
    const roadThreshold = 3;
    
    // Route principale horizontale
    if (Math.abs(z) < roadThreshold && Math.abs(x) <= 50) return true;
    
    // Route principale verticale
    if (Math.abs(x) < roadThreshold && Math.abs(z) <= 50) return true;
    
    // Routes secondaires
    for (let roadX = -40; roadX <= 40; roadX += 20) {
      for (let roadZ = -40; roadZ <= 40; roadZ += 20) {
        if (roadX !== 0 && roadZ !== 0) {
          if (Math.abs(x - roadX) < roadThreshold && Math.abs(z - roadZ) < 8) return true;
          if (Math.abs(z - roadZ) < roadThreshold && Math.abs(x - roadX) < 8) return true;
        }
      }
    }
    
    return false;
  }

  public getMapData(): MapData {
    if (!this.mapData) {
      this.logger.error('❌ MapData est null, génération d\'urgence...');
      this.generateMap();
    }
    this.logger.log(`🗺️ Retour de MapData avec ${this.mapData?.elements.length} éléments`);
    return this.mapData!;
  }

  public getMapElements(): MapElement[] {
    return this.getMapData().elements;
  }

  public getMapSeed(): number {
    return this.mapSeed;
  }

  public regenerateMap(): MapData {
    this.logger.log('🔄 Régénération de la carte...');
    this.generateMap();
    return this.mapData!;
  }
}
