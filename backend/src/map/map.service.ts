import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MapElement {
  type: 'road' | 'ground';
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
    this.initializeMap().catch((error) => {
      this.logger.error("❌ Erreur critique lors de l'initialisation:", error);
    });
  }

  private async initializeMap(): Promise<void> {
    try {
      // Vérifier si une carte existe déjà
      const existingMap = await this.prisma.map.findFirst({
        where: { name: 'main_map' },
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
      this.logger.error(
        "❌ Erreur lors de l'initialisation de la carte:",
        error,
      );
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
          },
        });
        this.logger.log('✅ Carte sauvegardée en base de données');
      } catch (error) {
        this.logger.error(
          '❌ Erreur lors de la sauvegarde de la carte:',
          error,
        );
      }
    }
  }

  private generateMap(): void {
    this.logger.log("🛣️ Génération d'un réseau routier simple...");

    const elements: MapElement[] = [];

    // Générer le sol de base
    this.generateGround(elements);

    // Générer uniquement les routes
    this.generateRoadNetwork(elements);

    this.mapData = {
      elements,
      seed: this.mapSeed,
      version: '3.0.0', // Version simplifiée - routes uniquement
      generatedAt: new Date().toISOString(),
    };

    this.logger.log(
      `✅ Réseau routier généré avec ${elements.length} éléments`,
    );
  }

  // Générer le sol de base
  private generateGround(elements: MapElement[]): void {
    elements.push({
      type: 'ground',
      position: { x: 0, y: -0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 200, y: 1, z: 200 },
      color: '#A0A0A0', // Gris clair
    });
  }

  // Générer un réseau routier simple et connecté
  private generateRoadNetwork(elements: MapElement[]): void {
    const roadLength = 18.95; // Longueur exacte du modèle GLB complet
    const roadWidth = 12.98; // Largeur exacte du modèle GLB complet
    const roadHeight = 0.03; // Hauteur exacte du modèle GLB

    // Routes principales - grille simple
    this.generateMainRoadGrid(elements, roadLength, roadWidth, roadHeight);

    // Routes secondaires - connectées aux principales
    this.generateSecondaryRoadGrid(elements, roadLength, roadWidth, roadHeight);
  }

  // Grille de routes principales (axes centraux)
  private generateMainRoadGrid(
    elements: MapElement[],
    roadLength: number,
    roadWidth: number,
    roadHeight: number,
  ): void {
    // Route horizontale centrale (axe X)
    const horizontalSegments = 10; // 10 segments pour couvrir ~200 unités
    for (let i = 0; i < horizontalSegments; i++) {
      const x = (i - horizontalSegments / 2) * roadLength;
      elements.push({
        type: 'road',
        position: { x: x, y: 0.1, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: roadLength, y: roadHeight, z: roadWidth },
        color: '#404040',
        metadata: {
          roadType: 'main',
          roadCondition: 'new',
          roadStyle: 'asphalt',
          orientation: 'horizontal',
          angle: 0,
          dimensions: {
            length: roadLength,
            width: roadWidth,
            height: roadHeight,
          },
          boundingBox: {
            min: {
              x: x - roadLength / 2,
              y: 0.1 - roadHeight / 2,
              z: -roadWidth / 2,
            },
            max: {
              x: x + roadLength / 2,
              y: 0.1 + roadHeight / 2,
              z: roadWidth / 2,
            },
          },
        },
      });
    }

    // Route verticale centrale (axe Z)
    const verticalSegments = 10; // 10 segments pour couvrir ~200 unités
    for (let i = 0; i < verticalSegments; i++) {
      const z = (i - verticalSegments / 2) * roadLength;
      elements.push({
        type: 'road',
        position: { x: 0, y: 0.15, z: z }, // Légèrement plus haut que les routes horizontales
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        scale: { x: roadWidth, y: roadHeight, z: roadLength },
        color: '#404040',
        metadata: {
          roadType: 'main',
          roadCondition: 'new',
          roadStyle: 'asphalt',
          orientation: 'vertical',
          angle: 90,
          dimensions: {
            length: roadLength,
            width: roadWidth,
            height: roadHeight,
          },
          boundingBox: {
            min: {
              x: -roadWidth / 2,
              y: 0.1 - roadHeight / 2,
              z: z - roadLength / 2,
            },
            max: {
              x: roadWidth / 2,
              y: 0.1 + roadHeight / 2,
              z: z + roadLength / 2,
            },
          },
        },
      });
    }
  }

  // Grille de routes secondaires (connectées aux principales)
  private generateSecondaryRoadGrid(
    elements: MapElement[],
    roadLength: number,
    roadWidth: number,
    roadHeight: number,
  ): void {
    const roadSpacing = 40; // Espacement entre les routes secondaires
    const segments = 6; // Nombre de segments par route secondaire

    // Routes horizontales secondaires
    for (
      let offset = -roadSpacing;
      offset <= roadSpacing;
      offset += roadSpacing
    ) {
      if (offset === 0) continue; // Éviter la route principale

      for (let i = 0; i < segments; i++) {
        const x = (i - segments / 2) * roadLength;
        elements.push({
          type: 'road',
          position: { x: x, y: 0.05, z: offset }, // Légèrement plus bas pour éviter le z-fighting
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: roadLength, y: roadHeight, z: roadWidth },
          color: '#505050', // Gris légèrement plus clair
          metadata: {
            roadType: 'secondary',
            roadCondition: 'worn',
            roadStyle: 'asphalt',
            orientation: 'horizontal',
          },
        });
      }
    }

    // Routes verticales secondaires
    for (
      let offset = -roadSpacing;
      offset <= roadSpacing;
      offset += roadSpacing
    ) {
      if (offset === 0) continue; // Éviter la route principale

      for (let i = 0; i < segments; i++) {
        const z = (i - segments / 2) * roadLength;
        elements.push({
          type: 'road',
          position: { x: offset, y: 0.05, z: z }, // Légèrement plus bas pour éviter le z-fighting
          rotation: { x: 0, y: Math.PI / 2, z: 0 },
          scale: { x: roadWidth, y: roadHeight, z: roadLength },
          color: '#505050', // Gris légèrement plus clair
          metadata: {
            roadType: 'secondary',
            roadCondition: 'worn',
            roadStyle: 'asphalt',
            orientation: 'vertical',
          },
        });
      }
    }
  }

  public getMapData(): MapData {
    if (!this.mapData) {
      this.logger.error("❌ MapData est null, génération d'urgence...");
      this.generateMap();
    }
    this.logger.log(
      `🗺️ Retour de MapData avec ${this.mapData?.elements.length} éléments`,
    );
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

  // Méthode pour forcer la régénération complète (supprime l'ancienne carte)
  public async forceRegenerateMap(): Promise<MapData> {
    this.logger.log('🔄 Régénération forcée de la carte...');

    // Supprimer l'ancienne carte de la base de données
    await this.prisma.map.deleteMany({
      where: { name: 'main_map' },
    });

    // Régénérer et sauvegarder
    await this.generateAndSaveMap();
    return this.mapData!;
  }
}
