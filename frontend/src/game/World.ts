import * as THREE from "three";
import { ModelManager } from "./ModelManager";
import { RoadManager } from "./RoadManager";
import { GroundManager } from "./GroundManager";
import { DebugManager } from "./DebugManager";

export interface MapElement {
  type: "road" | "ground";
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

export class World {
  group: THREE.Group;
  private mapData: MapData | null = null;
  private isMapLoaded = false;
  private mapDataCallback?: (data: MapData) => void;
  private modelManager: ModelManager;
  private roadManager: RoadManager;
  private groundManager: GroundManager;
  private debugManager: DebugManager;

  constructor() {
    this.group = new THREE.Group();
    this.modelManager = new ModelManager();
    this.roadManager = new RoadManager(this.modelManager);
    this.groundManager = new GroundManager();
    this.debugManager = new DebugManager();
    
    // Ajouter les labels de debug au groupe principal
    this.group.add(this.debugManager.getDebugLabels());
    
    console.log("🌍 Monde initialisé - version modulaire");
  }

  setMapDataCallback(callback: (data: MapData) => void) {
    this.mapDataCallback = callback;
  }

  async receiveMapData(mapData: MapData) {
    console.log("🗺️ Réception des données de carte du serveur:", mapData);
    console.log("📊 Nombre d'éléments reçus:", mapData.elements.length);
    console.log(
      "🔍 Premiers éléments:",
      mapData.elements.slice(0, 3)
    );
    
    this.mapData = mapData;
    this.isMapLoaded = true;
    
    if (this.mapDataCallback) {
      this.mapDataCallback(mapData);
    }
    
    await this.buildMap();
  }

  async buildMap() {
    if (!this.isMapLoaded || !this.mapData) {
      console.log("⏳ En attente des données de carte du serveur...");
      return;
    }

    if (this.mapData) {
      console.log("🗺️ Utilisation des données du serveur pour créer la carte");
      console.log("📊 Nombre d'éléments dans mapData:", this.mapData.elements.length);
      console.log("🔍 Premiers éléments:", this.mapData.elements.slice(0, 3));
    } else {
      console.log("⚠️ Aucune donnée de serveur, attente des données...");
      console.log("💡 Utilisez getMapViaHTTP() pour récupérer les données du serveur");
      return;
    }

    // Effacer l'ancienne carte
    this.clearMap();

    // Construire la nouvelle carte
    await this.buildMapFromServerData();
  }

  private clearMap() {
    console.log("🧹 Effacement de l'ancienne carte...");
    
    const childrenToRemove = this.group.children.filter(child => 
      child.userData.type === 'road' || child.userData.type === 'ground'
    );
    
    childrenToRemove.forEach(child => {
      this.group.remove(child);
    });
    
    console.log(`🗑️ ${childrenToRemove.length} éléments supprimés`);
  }

  private async buildMapFromServerData() {
    if (!this.mapData) return;

    console.log("🏗️ Construction de la carte depuis les données serveur...");
    
    const elements = this.mapData.elements;
    console.log(
      `📊 Construction de ${elements.length} éléments: ${elements.filter(e => e.type === 'road').length} routes, ${elements.filter(e => e.type === 'ground').length} sols`
    );
    
    for (const element of elements) {
      if (element.type === 'road') {
        console.log(`🛣️ Création d'une route à la position:`, element.position);
        const road = await this.roadManager.createComplexRoad(element);
        this.group.add(road);
        console.log(`✅ Route ajoutée au monde. Position finale:`, {
          x: road.position.x,
          y: road.position.y,
          z: road.position.z
        });
      } else if (element.type === 'ground') {
        const ground = this.groundManager.createComplexGround(element);
        this.group.add(ground);
      }
    }
    
    console.log(`✅ Carte construite avec ${elements.length} éléments: ${elements.filter(e => e.type === 'road').length} routes, ${elements.filter(e => e.type === 'ground').length} sols`);
  }

  // Méthodes de debug et test
  async generateLocalMap() {
    console.log("🏗️ Génération de carte locale simple (routes uniquement)...");
    
    // Effacer l'ancienne carte
    this.clearMap();
    
    // Créer quelques routes de test avec des positions différentes
    const testRoutes = [
      {
        type: "road" as const,
        position: { x: 0, y: 0.1, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 18.9, y: 0.03, z: 13.0 },
        color: "#404040"
      },
      {
        type: "road" as const,
        position: { x: 20, y: 0.1, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 18.9, y: 0.03, z: 13.0 },
        color: "#505050"
      },
      {
        type: "road" as const,
        position: { x: 0, y: 0.1, z: 20 },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        scale: { x: 18.9, y: 0.03, z: 13.0 },
        color: "#606060"
      }
    ];
    
    for (const routeData of testRoutes) {
      const road = await this.roadManager.createComplexRoad(routeData);
      this.group.add(road);
    }
    
    console.log("✅ Carte locale créée - routes uniquement");
  }

  async testRoadCreation() {
    console.log("🧪 Test de création de routes...");
    
    const testElement = {
      type: "road" as const,
      position: { x: 0, y: 0.1, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 18.9, y: 0.03, z: 13.0 },
      color: "#404040"
    };

    const testRoad = await this.roadManager.createComplexRoad(testElement);
    this.group.add(testRoad);
    
    console.log("🧪 Route de test créée:", testRoad);
    console.log("✅ Route de test ajoutée au groupe");
    
    // Compter les routes dans le monde
    const roadCount = this.group.children.filter(child => 
      child.userData.type === 'road'
    ).length;
    
    console.log(`📊 Nombre de routes trouvées dans le monde: ${roadCount}`);
    
    return testRoad;
  }

  async forceLocalMapWithDifferentPositions() {
    console.log("🔄 Forçage de la carte locale avec positions différentes...");
    
    // Effacer l'ancienne carte
    this.clearMap();
    
    // Créer des routes avec des positions très différentes
    const testRoutes = [
      {
        type: "road" as const,
        position: { x: -50, y: 0.1, z: -50 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 18.9, y: 0.03, z: 13.0 },
        color: "#FF0000"
      },
      {
        type: "road" as const,
        position: { x: 50, y: 0.1, z: 50 },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        scale: { x: 18.9, y: 0.03, z: 13.0 },
        color: "#00FF00"
      }
    ];
    
    for (const routeData of testRoutes) {
      const road = await this.roadManager.createComplexRoad(routeData);
      this.group.add(road);
    }
    
    console.log("✅ Carte locale créée avec positions différentes");
  }

  diagnoseMapData() {
    console.log("🔍 Diagnostic des données de carte:");
    console.log("- isMapLoaded:", this.isMapLoaded);
    console.log("- mapData existe:", !!this.mapData);
    
    if (this.mapData) {
      console.log("- Nombre d'éléments:", this.mapData.elements.length);
      console.log("- Version:", this.mapData.version);
      console.log("- Seed:", this.mapData.seed);
      console.log("- Premiers éléments:", this.mapData.elements.slice(0, 3));
      
      const roadCount = this.mapData.elements.filter(e => e.type === 'road').length;
      const groundCount = this.mapData.elements.filter(e => e.type === 'ground').length;
      
      console.log(`- Routes: ${roadCount}, Sols: ${groundCount}`);
      
      // Afficher les positions des routes
      const roadPositions = this.mapData.elements
        .filter(e => e.type === 'road')
        .map(e => ({ x: e.position.x, y: e.position.y, z: e.position.z }));
      
      console.log("- Positions des routes:", roadPositions.slice(0, 5));
    } else {
      console.log("❌ Aucune donnée de carte disponible");
    }
  }

  getMapData() {
    return this.mapData;
  }

  isMapDataLoaded() {
    return this.isMapLoaded;
  }
}