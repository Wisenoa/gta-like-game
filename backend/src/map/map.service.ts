import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MapElement {
  type: 'road' | 'ground' | 'streetlight' | 'building';
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

    // Lampadaires le long des routes
    this.generateStreetlights(elements, roadLength, roadWidth);

    // Bâtiments
    this.generateBuildings(elements, roadLength, roadWidth);
  }

  // Grille de routes principales (axes centraux) avec système de pont/viaduc
  private generateMainRoadGrid(
    elements: MapElement[],
    roadLength: number,
    roadWidth: number,
    roadHeight: number,
  ): void {
    const horizontalSegments = 10;
    const verticalSegments = 10;
    const segmentSpacing = roadLength * 0.8;

    // Routes horizontales - au niveau du sol (y = 0)
    for (let i = 0; i < horizontalSegments; i++) {
      const x = (i - horizontalSegments / 2) * segmentSpacing;

      elements.push({
        type: 'road',
        position: { x: x, y: 0, z: 0 },
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

    // Routes verticales - au même niveau (y = 0) pour éviter les dénivelés
    for (let i = 0; i < verticalSegments; i++) {
      const z = (i - verticalSegments / 2) * segmentSpacing;

      elements.push({
        type: 'road',
        position: { x: 0, y: 0, z: z }, // Même niveau que les horizontales
        rotation: { x: 0, y: 0, z: 0 },
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
              y: 0.8 - roadHeight / 2,
              z: z - roadLength / 2,
            },
            max: {
              x: roadWidth / 2,
              y: 0.8 + roadHeight / 2,
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
          position: { x: x, y: 0.05 + i * 0.005, z: offset }, // Légèrement plus bas pour éviter le z-fighting
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
          position: { x: offset, y: 0.05 + i * 0.005, z: z }, // Légèrement plus bas pour éviter le z-fighting
          rotation: { x: 0, y: 0, z: 0 },
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

  // Générer les lampadaires le long des routes (en évitant les intersections)
  private generateStreetlights(
    elements: MapElement[],
    roadLength: number,
    roadWidth: number,
  ): void {
    const streetlightSpacing = 25; // Espacement entre les lampadaires
    const streetlightHeight = 4.0; // Hauteur du lampadaire
    const streetlightWidth = 0.1; // Largeur du poteau

    // Collecter tous les lampadaires potentiels
    const potentialStreetlights: MapElement[] = [];

    // Lampadaires le long des routes horizontales
    const horizontalSegments = 10;
    const segmentSpacing = roadLength * 0.8;

    for (let i = 0; i < horizontalSegments; i++) {
      const x = (i - horizontalSegments / 2) * segmentSpacing;

      // Lampadaires de chaque côté de la route
      potentialStreetlights.push({
        type: 'streetlight',
        position: { x: x, y: 0, z: roadWidth / 2 + 1 }, // Côté droit
        rotation: { x: 0, y: 0, z: 0 },
        scale: {
          x: streetlightWidth,
          y: streetlightHeight,
          z: streetlightWidth,
        },
        color: '#C0C0C0', // Gris métallique
        metadata: {
          streetlightType: 'modern',
          hasLight: true,
          lightColor: '#FFFFFF',
          lightIntensity: 1.0,
          orientation: 'horizontal',
          side: 'right',
        },
      });

      potentialStreetlights.push({
        type: 'streetlight',
        position: { x: x, y: 0, z: -roadWidth / 2 - 1 }, // Côté gauche
        rotation: { x: 0, y: 0, z: 0 },
        scale: {
          x: streetlightWidth,
          y: streetlightHeight,
          z: streetlightWidth,
        },
        color: '#C0C0C0', // Gris métallique
        metadata: {
          streetlightType: 'modern',
          hasLight: true,
          lightColor: '#FFFFFF',
          lightIntensity: 1.0,
          orientation: 'horizontal',
          side: 'left',
        },
      });
    }

    // Lampadaires le long des routes verticales
    const verticalSegments = 10;

    for (let i = 0; i < verticalSegments; i++) {
      const z = (i - verticalSegments / 2) * segmentSpacing;

      // Lampadaires de chaque côté de la route
      potentialStreetlights.push({
        type: 'streetlight',
        position: { x: roadWidth / 2 + 1, y: 0, z: z }, // Côté droit
        rotation: { x: 0, y: 0, z: 0 },
        scale: {
          x: streetlightWidth,
          y: streetlightHeight,
          z: streetlightWidth,
        },
        color: '#C0C0C0', // Gris métallique
        metadata: {
          streetlightType: 'modern',
          hasLight: true,
          lightColor: '#FFFFFF',
          lightIntensity: 1.0,
          orientation: 'vertical',
          side: 'right',
        },
      });

      potentialStreetlights.push({
        type: 'streetlight',
        position: { x: -roadWidth / 2 - 1, y: 0, z: z }, // Côté gauche
        rotation: { x: 0, y: 0, z: 0 },
        scale: {
          x: streetlightWidth,
          y: streetlightHeight,
          z: streetlightWidth,
        },
        color: '#C0C0C0', // Gris métallique
        metadata: {
          streetlightType: 'modern',
          hasLight: true,
          lightColor: '#FFFFFF',
          lightIntensity: 1.0,
          orientation: 'vertical',
          side: 'left',
        },
      });
    }

    // Filtrer les lampadaires qui ne sont pas sur des routes
    const validStreetlights = potentialStreetlights.filter((streetlight) => {
      return !this.isStreetlightOnRoad(streetlight, elements);
    });

    // Ajouter les lampadaires valides
    elements.push(...validStreetlights);
  }

  // Vérifier si un lampadaire est placé sur une route
  private isStreetlightOnRoad(
    streetlight: MapElement,
    allElements: MapElement[],
  ): boolean {
    const streetlightPos = streetlight.position;
    const streetlightRadius = streetlight.scale.x / 2; // Rayon du lampadaire

    // Vérifier contre toutes les routes
    for (const element of allElements) {
      if (element.type === 'road') {
        const roadPos = element.position;
        const roadHalfWidth = element.scale.x / 2;
        const roadHalfLength = element.scale.z / 2;

        // Vérifier si le lampadaire est dans la zone de la route
        const isInRoadX =
          Math.abs(streetlightPos.x - roadPos.x) <=
          roadHalfWidth + streetlightRadius;
        const isInRoadZ =
          Math.abs(streetlightPos.z - roadPos.z) <=
          roadHalfLength + streetlightRadius;

        if (isInRoadX && isInRoadZ) {
          return true; // Le lampadaire est sur une route
        }
      }
    }

    return false; // Le lampadaire n'est pas sur une route
  }

  // Générer des bâtiments autour des routes
  private generateBuildings(
    elements: MapElement[],
    roadLength: number,
    roadWidth: number,
  ): void {
    const buildingSpacing = 60; // Espacement entre les bâtiments
    const buildingSize = 15; // Taille des bâtiments
    const buildingHeight = 6; // Hauteur des bâtiments (2 étages)

    // Positions où placer les bâtiments (éviter les routes)
    const buildingPositions = [
      // Côté nord des routes horizontales
      { x: -buildingSpacing, z: buildingSpacing },
      { x: 0, z: buildingSpacing },
      { x: buildingSpacing, z: buildingSpacing },

      // Côté sud des routes horizontales
      { x: -buildingSpacing, z: -buildingSpacing },
      { x: 0, z: -buildingSpacing },
      { x: buildingSpacing, z: -buildingSpacing },

      // Côté est des routes verticales
      { x: buildingSpacing, z: -buildingSpacing },
      { x: buildingSpacing, z: 0 },
      { x: buildingSpacing, z: buildingSpacing },

      // Côté ouest des routes verticales
      { x: -buildingSpacing, z: -buildingSpacing },
      { x: -buildingSpacing, z: 0 },
      { x: -buildingSpacing, z: buildingSpacing },
    ];

    for (const pos of buildingPositions) {
      // Vérifier que le bâtiment n'est pas sur une route
      if (!this.isPositionOnRoad(pos, elements, roadWidth)) {
        elements.push({
          type: 'building',
          position: { x: pos.x, y: 0, z: pos.z },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: buildingSize, y: buildingHeight, z: buildingSize },
          color: '#8B4513', // Brun pour les bâtiments
          metadata: {
            buildingType: 'residential',
            floors: 2,
            hasWindows: true,
            roofType: 'flat',
          },
        });
      }
    }
  }

  // Vérifier si une position est sur une route
  private isPositionOnRoad(
    position: { x: number; z: number },
    allElements: MapElement[],
    roadWidth: number,
  ): boolean {
    for (const element of allElements) {
      if (element.type === 'road') {
        const roadPos = element.position;
        const roadHalfWidth = element.scale.x / 2;
        const roadHalfLength = element.scale.z / 2;

        // Vérifier si la position est dans la zone de la route
        const isInRoadX = Math.abs(position.x - roadPos.x) <= roadHalfWidth;
        const isInRoadZ = Math.abs(position.z - roadPos.z) <= roadHalfLength;

        if (isInRoadX && isInRoadZ) {
          return true; // La position est sur une route
        }
      }
    }

    return false; // La position n'est pas sur une route
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
