import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MapElement {
  type: 'building' | 'road' | 'tree' | 'lamp' | 'car' | 'ground';
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
    this.logger.log('🏙️ Génération d\'une ville réaliste...');
    
    const elements: MapElement[] = [];
    
    // Générer une vraie ville
    this.generateCityLayout(elements);
    
    // Générer les routes principales
    this.generateMainRoads(elements);
    
    // Générer les routes secondaires
    this.generateSecondaryRoads(elements);
    
    // Générer les bâtiments par quartiers
    this.generateResidentialDistrict(elements);
    this.generateCommercialDistrict(elements);
    this.generateIndustrialDistrict(elements);
    
    // Générer les espaces verts
    this.generateParks(elements);
    
    // Générer l'éclairage urbain
    this.generateStreetLights(elements);
    
    // Générer les véhicules
    this.generateParkedCars(elements);

    this.mapData = {
      elements,
      seed: this.mapSeed,
      version: '2.1.0', // Version with varied elements
      generatedAt: new Date().toISOString(),
    };

    this.logger.log(`✅ Ville générée avec ${elements.length} éléments`);
  }

  // Générer la structure de base de la ville
  private generateCityLayout(elements: MapElement[]): void {
    // Créer le sol de base
    elements.push({
      type: 'ground',
      position: { x: 0, y: -0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 100, y: 1, z: 100 }, // Réduit de 200 à 100
      color: '#A0A0A0', // Gris clair
    });
  }

  // Routes principales (boulevards)
  private generateMainRoads(elements: MapElement[]): void {
    // Boulevard principal horizontal (axe X) - Route segmentée pour éviter les artefacts
    for (let x = -80; x <= 80; x += 10) {
      elements.push({
        type: 'road',
        position: { x, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 10, y: 0.1, z: 8 }, // Segments de 10 unités
        color: '#404040',
      });
    }

    // Boulevard principal vertical (axe Z) - Route segmentée (éviter le centre)
    for (let z = -80; z <= 80; z += 10) {
      if (z !== 0) { // Éviter le centre pour éviter le chevauchement
        elements.push({
          type: 'road',
          position: { x: 0, y: 0, z },
          rotation: { x: 0, y: Math.PI / 2, z: 0 },
          scale: { x: 10, y: 0.1, z: 8 }, // Segments de 10 unités
          color: '#404040',
        });
      }
    }
  }

  // Routes secondaires (rues de quartier)
  private generateSecondaryRoads(elements: MapElement[]): void {
    // Système de grille sans chevauchement - routes secondaires décalées
    const horizontalRoads = [-60, -40, -20, 20, 40, 60];
    const verticalRoads = [-60, -40, -20, 20, 40, 60];
    
    // Routes horizontales secondaires (décalées pour éviter les routes principales)
    for (const x of horizontalRoads) {
      // Route au-dessus du centre
      elements.push({
        type: 'road',
        position: { x, y: 0, z: 12 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 140, y: 0.1, z: 4 }, // Routes secondaires plus étroites
        color: '#606060', // Gris plus clair
      });
      
      // Route en-dessous du centre
      elements.push({
        type: 'road',
        position: { x, y: 0, z: -12 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 140, y: 0.1, z: 4 }, // Routes secondaires plus étroites
        color: '#606060', // Gris plus clair
      });
    }
    
    // Routes verticales secondaires (décalées pour éviter les routes principales)
    for (const z of verticalRoads) {
      // Route à gauche du centre
      elements.push({
        type: 'road',
        position: { x: -12, y: 0, z },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        scale: { x: 140, y: 0.1, z: 4 }, // Routes secondaires plus étroites
        color: '#606060', // Gris plus clair
      });
      
      // Route à droite du centre
      elements.push({
        type: 'road',
        position: { x: 12, y: 0, z },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        scale: { x: 140, y: 0.1, z: 4 }, // Routes secondaires plus étroites
        color: '#606060', // Gris plus clair
      });
    }
  }

  // Quartier résidentiel (maisons individuelles)
  private generateResidentialDistrict(elements: MapElement[]): void {
    const residentialZones = [
      { minX: -80, maxX: -20, minZ: -80, maxZ: -20 }, // Quartier nord-ouest
      { minX: 20, maxX: 80, minZ: -80, maxZ: -20 },  // Quartier nord-est
      { minX: -80, maxX: -20, minZ: 20, maxZ: 80 },  // Quartier sud-ouest
    ];

    for (const zone of residentialZones) {
      for (let x = zone.minX + 5; x < zone.maxX - 5; x += 12) {
        for (let z = zone.minZ + 5; z < zone.maxZ - 5; z += 12) {
          // Vérifier qu'on n'est pas sur une route
          if (Math.abs(x) % 20 !== 0 && Math.abs(z) % 20 !== 0) {
            // Créer des maisons variées
            const houseTypes = [
              { scale: { x: 3, y: 2.5, z: 3 }, color: '#8B4513', type: 'house_small' },
              { scale: { x: 4, y: 3, z: 4 }, color: '#A0522D', type: 'house_medium' },
              { scale: { x: 5, y: 3.5, z: 4 }, color: '#CD853F', type: 'house_large' },
              { scale: { x: 3, y: 4, z: 3 }, color: '#D2691E', type: 'house_tall' },
            ];
            
            const houseType = houseTypes[Math.floor(Math.random() * houseTypes.length)];
            
            elements.push({
              type: 'building',
              position: { x, y: 0, z },
              rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
              scale: houseType.scale,
              color: houseType.color,
              metadata: { subtype: houseType.type }
            });
          }
        }
      }
    }
  }

  // Quartier commercial (bâtiments moyens)
  private generateCommercialDistrict(elements: MapElement[]): void {
    const commercialZones = [
      { minX: -20, maxX: 20, minZ: -80, maxZ: -20 }, // Centre-nord
      { minX: -20, maxX: 20, minZ: 20, maxZ: 80 },  // Centre-sud
    ];

    for (const zone of commercialZones) {
      for (let x = zone.minX + 8; x < zone.maxX - 8; x += 16) {
        for (let z = zone.minZ + 8; z < zone.maxZ - 8; z += 16) {
          if (Math.abs(x) % 20 !== 0 && Math.abs(z) % 20 !== 0) {
            // Créer des bâtiments commerciaux variés
            const commercialTypes = [
              { scale: { x: 6, y: 8, z: 6 }, color: '#696969', type: 'office_small' },
              { scale: { x: 8, y: 10, z: 8 }, color: '#778899', type: 'office_medium' },
              { scale: { x: 10, y: 12, z: 8 }, color: '#708090', type: 'office_large' },
              { scale: { x: 6, y: 6, z: 6 }, color: '#2F4F4F', type: 'shop' },
              { scale: { x: 8, y: 4, z: 8 }, color: '#4682B4', type: 'mall' },
            ];
            
            const commercialType = commercialTypes[Math.floor(Math.random() * commercialTypes.length)];
            
            elements.push({
              type: 'building',
              position: { x, y: 0, z },
              rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
              scale: commercialType.scale,
              color: commercialType.color,
              metadata: { subtype: commercialType.type }
            });
          }
        }
      }
    }
  }

  // Quartier industriel (grands bâtiments)
  private generateIndustrialDistrict(elements: MapElement[]): void {
    const industrialZones = [
      { minX: 20, maxX: 80, minZ: 20, maxZ: 80 }, // Sud-est
    ];

    for (const zone of industrialZones) {
      for (let x = zone.minX + 10; x < zone.maxX - 10; x += 20) {
        for (let z = zone.minZ + 10; z < zone.maxZ - 10; z += 20) {
          // Créer des bâtiments industriels variés
          const industrialTypes = [
            { scale: { x: 10, y: 12, z: 10 }, color: '#2F4F4F', type: 'factory_large' },
            { scale: { x: 12, y: 8, z: 8 }, color: '#556B2F', type: 'warehouse' },
            { scale: { x: 8, y: 15, z: 8 }, color: '#8FBC8F', type: 'tower' },
            { scale: { x: 15, y: 6, z: 15 }, color: '#6B8E23', type: 'plant' },
            { scale: { x: 6, y: 20, z: 6 }, color: '#228B22', type: 'chimney' },
          ];
          
          const industrialType = industrialTypes[Math.floor(Math.random() * industrialTypes.length)];
          
          elements.push({
            type: 'building',
            position: { x, y: 0, z },
            rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
            scale: industrialType.scale,
            color: industrialType.color,
            metadata: { subtype: industrialType.type }
          });
        }
      }
    }
  }

  // Parcs et espaces verts
  private generateParks(elements: MapElement[]): void {
    const parks = [
      { x: -50, z: -50, size: 15 },
      { x: 50, z: -50, size: 12 },
      { x: -50, z: 50, size: 10 },
    ];

    for (const park of parks) {
      // Pelouse du parc
      elements.push({
        type: 'ground',
        position: { x: park.x, y: 0, z: park.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: park.size, y: 0.1, z: park.size },
        color: '#228B22', // Vert forêt
      });

      // Arbres variés dans le parc
      const treeTypes = [
        { scale: { x: 0.8, y: 1.5, z: 0.8 }, color: '#006400', type: 'tree_small' },
        { scale: { x: 1, y: 2, z: 1 }, color: '#228B22', type: 'tree_medium' },
        { scale: { x: 1.2, y: 2.5, z: 1.2 }, color: '#32CD32', type: 'tree_large' },
        { scale: { x: 0.6, y: 3, z: 0.6 }, color: '#9ACD32', type: 'tree_tall' },
      ];
      
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = park.size * 0.3;
        const treeX = park.x + Math.cos(angle) * radius;
        const treeZ = park.z + Math.sin(angle) * radius;
        
        const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
        
        elements.push({
          type: 'tree',
          position: { x: treeX, y: 0, z: treeZ },
          rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
          scale: treeType.scale,
          color: treeType.color,
          metadata: { subtype: treeType.type }
        });
      }
    }
  }

  // Éclairage urbain
  private generateStreetLights(elements: MapElement[]): void {
    // Lampadaires le long des routes principales
    for (let x = -80; x <= 80; x += 20) {
      if (x % 40 !== 0) { // Alterner les côtés
        elements.push({
          type: 'lamp',
          position: { x, y: 0, z: 8 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.2, y: 3, z: 0.2 },
          color: '#C0C0C0',
        });
        elements.push({
          type: 'lamp',
          position: { x, y: 0, z: -8 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.2, y: 3, z: 0.2 },
          color: '#C0C0C0',
        });
      }
    }

    for (let z = -80; z <= 80; z += 20) {
      if (z % 40 !== 0) {
        elements.push({
          type: 'lamp',
          position: { x: 8, y: 0, z },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.2, y: 3, z: 0.2 },
          color: '#C0C0C0',
        });
        elements.push({
          type: 'lamp',
          position: { x: -8, y: 0, z },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.2, y: 3, z: 0.2 },
          color: '#C0C0C0',
        });
      }
    }
  }

  // Véhicules garés variés
  private generateParkedCars(elements: MapElement[]): void {
    const parkingSpots = [
      { x: -30, z: -30 }, { x: -30, z: 30 }, { x: 30, z: -30 }, { x: 30, z: 30 },
      { x: -15, z: -15 }, { x: -15, z: 15 }, { x: 15, z: -15 }, { x: 15, z: 15 },
    ];

    const carTypes = [
      { scale: { x: 1, y: 0.5, z: 2 }, color: '#FF0000', type: 'car_sedan' },
      { scale: { x: 1.2, y: 0.6, z: 2.2 }, color: '#0000FF', type: 'car_suv' },
      { scale: { x: 0.8, y: 0.4, z: 1.8 }, color: '#FFFF00', type: 'car_compact' },
      { scale: { x: 1.5, y: 0.7, z: 2.5 }, color: '#00FF00', type: 'car_truck' },
      { scale: { x: 0.9, y: 0.3, z: 1.9 }, color: '#FFA500', type: 'car_sports' },
      { scale: { x: 1.1, y: 0.5, z: 2.1 }, color: '#800080', type: 'car_luxury' },
    ];

    for (const spot of parkingSpots) {
      const carType = carTypes[Math.floor(Math.random() * carTypes.length)];
      
      elements.push({
        type: 'car',
        position: { x: spot.x, y: 0, z: spot.z },
        rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
        scale: carType.scale,
        color: carType.color,
        metadata: { subtype: carType.type }
      });
    }
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
