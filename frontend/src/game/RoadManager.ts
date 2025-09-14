import * as THREE from "three";
import { ModelManager } from "./ModelManager";

export interface MapElement {
  type: "road" | "ground";
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color?: string;
  metadata?: {
    roadType?: 'main' | 'secondary' | 'residential' | 'highway';
    roadCondition?: 'new' | 'worn' | 'damaged';
    roadStyle?: 'asphalt' | 'concrete' | 'cobblestone';
  };
}

export class RoadManager {
  private modelManager: ModelManager;

  constructor(modelManager: ModelManager) {
    this.modelManager = modelManager;
  }

  async createComplexRoad(element: MapElement): Promise<THREE.Group> {
    console.log("🔄 Création d'une route complexe avec modèle GLB");
    console.log("📍 Position de l'élément:", element.position);
    console.log("📏 Échelle de l'élément:", element.scale);
    console.log("🔄 Rotation de l'élément:", element.rotation);
    
    // Utilisons directement les routes simples avec les rotations du serveur
    console.log("🔄 Utilisation des routes simples avec rotations serveur");
    return this.createSimpleRoad(element);
  }

  private getRoadModelPath(element: MapElement): string {
    const metadata = element.metadata || {};
    const roadType = metadata.roadType || 'main';
    const roadCondition = metadata.roadCondition || 'new';
    const roadStyle = metadata.roadStyle || 'asphalt';

    // Pour l'instant, on utilise le modèle de base
    return "/models/low_road.glb";
  }

  private async analyzeGLBDimensions(): Promise<void> {
    console.log("🔍 Analyse des dimensions du modèle GLB...");
    
    try {
      const model = await this.modelManager.loadModel("/models/low_road.glb");
      if (!model) {
        console.error("❌ Modèle GLB non trouvé");
        return;
      }

      // Calculer les dimensions du modèle complet
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      console.log("📐 Dimensions du modèle GLB complet:");
      console.log("- Taille:", {
        x: size.x.toFixed(2),
        y: size.y.toFixed(2),
        z: size.z.toFixed(2)
      });
      console.log("- Centre:", {
        x: center.x.toFixed(2),
        y: center.y.toFixed(2),
        z: center.z.toFixed(2)
      });

      // Analyser chaque maillage individuellement
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const childBox = new THREE.Box3().setFromObject(child);
          const childSize = childBox.getSize(new THREE.Vector3());
          const childCenter = childBox.getCenter(new THREE.Vector3());
          
          console.log(`📦 Maillage #${child.id} (${child.name}):`);
          console.log(`  - Taille: {x: '${childSize.x.toFixed(2)}', y: '${childSize.y.toFixed(2)}', z: '${childSize.z.toFixed(2)}'}`);
          console.log(`  - Centre: {x: '${childCenter.x.toFixed(2)}', y: '${childCenter.y.toFixed(2)}', z: '${childCenter.z.toFixed(2)}'}`);
        }
      });
      
      // Compter le nombre de maillages
      let meshCount = 0;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshCount++;
        }
      });
      
      console.log(`📊 Total de maillages: ${meshCount}`);
      
      // Recommandations pour le serveur
      console.log("💡 Recommandations pour le serveur:");
      console.log(`- roadLength: ${size.x.toFixed(1)} (dimension X du modèle)`);
      console.log(`- roadWidth: ${size.z.toFixed(1)} (dimension Z du modèle)`);
      console.log(`- roadHeight: ${size.y.toFixed(1)} (dimension Y du modèle)`);
      
    } catch (error) {
      console.error("❌ Erreur lors de l'analyse du modèle GLB:", error);
    }
  }

  private addDebugBoundingBox(element: MapElement, roadInstance: THREE.Group): void {
    // Créer une boîte de debug avec les dimensions du serveur
    const expectedLength = element.scale.x; // 18.95
    const expectedWidth = element.scale.z;  // 12.98
    const expectedHeight = element.scale.y; // 0.03
    
    // Créer une géométrie de boîte avec les dimensions attendues
    const boxGeometry = new THREE.BoxGeometry(expectedLength, expectedHeight * 100, expectedWidth);
    const boxMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, // Rouge
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    
    const debugBox = new THREE.Mesh(boxGeometry, boxMaterial);
    debugBox.position.set(0, expectedHeight * 50, 0); // Centrer verticalement
    
    // Appliquer la même rotation que la route
    debugBox.rotation.set(
      -Math.PI / 2, // Rotation fixe sur X négative pour coucher
      0, // Pas de rotation sur Y
      element.metadata?.orientation === 'vertical' ? Math.PI / 2 : 0 // Rotation Z pour les routes verticales
    );
    
    roadInstance.add(debugBox);
    
    console.log("🔍 Debug box ajoutée:", {
      expectedLength,
      expectedWidth,
      expectedHeight,
      orientation: element.metadata?.orientation
    });
  }

  private async createGLBRoad(element: MapElement): Promise<THREE.Group> {
    console.log("✅ Utilisation de la route simple au lieu du modèle GLB");
    return this.createSimpleRoad(element);
    
    const model = await this.modelManager.loadModel("/models/low_road.glb");
    if (!model) {
      throw new Error("Modèle GLB non trouvé");
    }

    // Trouver le maillage qu'on veut garder
    let targetMesh: THREE.Mesh | null = null;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === 'Plane_Material001_0') {
        targetMesh = child;
      }
    });

    if (!targetMesh) {
      throw new Error("Maillage Plane_Material001_0 non trouvé");
    }

    console.log(`📦 Maillage trouvé: ${targetMesh.name}`);
    
    // Cloner seulement le maillage qu'on veut
    const roadInstance = targetMesh.clone();
    
    // Utiliser les dimensions du modèle complet pour éviter les problèmes de division par zéro
    const modelBox = new THREE.Box3().setFromObject(model);
    const modelSize = modelBox.getSize(new THREE.Vector3());
    const modelCenter = modelBox.getCenter(new THREE.Vector3());
    
    console.log("📐 Dimensions du modèle complet:", {
      size: {
        x: modelSize.x.toFixed(2),
        y: modelSize.y.toFixed(2),
        z: modelSize.z.toFixed(2)
      },
      center: {
        x: modelCenter.x.toFixed(2),
        y: modelCenter.y.toFixed(2),
        z: modelCenter.z.toFixed(2)
      }
    });
    
    // Centrer le maillage par rapport au centre du modèle complet
    // roadInstance.position.set(-modelCenter.x, -modelCenter.y, -modelCenter.z);
    
    // Appliquer la rotation pour coucher + orientation selon le type de route
    const isVerticalRoad = element.metadata?.orientation === 'vertical';
    console.log('element.metadata :>> ', element.metadata, 'isVerticalRoad :>> ', isVerticalRoad);
    const zRotation = isVerticalRoad ? Math.PI / 2 : 0;
    
    roadInstance.rotation.set(
      -Math.PI / 2, // Rotation fixe sur X négative pour coucher
      0, // Pas de rotation sur Y
      zRotation  // Rotation Z pour les routes verticales
    );
    
    // Ajuster la taille selon les dimensions attendues
    const expectedLength = element.scale.x; // 18.95
    const expectedWidth = element.scale.z;  // 12.98
    
    // Calculer les facteurs d'échelle basés sur le modèle complet
    const scaleX = expectedLength / modelSize.x;
    const scaleZ = expectedWidth / modelSize.z;
    
    console.log("🔧 Ajustement de taille:", {
      expectedLength,
      expectedWidth,
      modelSize: {
        x: modelSize.x.toFixed(2),
        z: modelSize.z.toFixed(2)
      },
      scaleX: scaleX.toFixed(2),
      scaleZ: scaleZ.toFixed(2)
    });
    
    // Utiliser l'échelle pour correspondre aux dimensions du serveur
    const finalScaleX = expectedLength / modelSize.x;
    const finalScaleZ = expectedWidth / modelSize.z;
    roadInstance.scale.set(finalScaleX, 1, finalScaleZ);
    
    // Positionner la route
    roadInstance.position.set(
      element.position.x,
      element.position.y,
      element.position.z
    );
    
    // Ajouter une boîte de debug pour vérifier les proportions
    this.addDebugBoundingBox(element, roadInstance);
    
    // Créer un groupe pour la route
    const roadGroup = new THREE.Group();
    roadGroup.add(roadInstance);
    
    console.log("✅ Maillage unique ajouté avec échelle");
    
    // Ajouter des propriétés pour le debug
    roadGroup.userData = {
      type: 'road',
      elementData: element,
      modelType: 'glb',
      meshCount: 1
    };
    
    console.log("✅ Route 3D créée avec le modèle GLB");
    console.log("📍 Position finale:", {
      x: roadGroup.position.x,
      y: roadGroup.position.y,
      z: roadGroup.position.z
    });
    
    console.log("🔄 Rotation finale:", {
      x: roadInstance.rotation.x,
      y: roadInstance.rotation.y,
      z: roadInstance.rotation.z
    });
    
    return roadGroup;
  }

  createSimpleRoad(element: MapElement): THREE.Group {
    console.log("🔄 Création d'une route simple améliorée");
    console.log("📍 Position de l'élément:", element.position);
    console.log("📏 Échelle de l'élément:", element.scale);
    console.log("🔄 Rotation de l'élément:", element.rotation);
    
    // Créer la géométrie directement avec les dimensions du serveur
    const geometry = new THREE.BoxGeometry(
      element.scale.x, // largeur
      element.scale.y, // hauteur  
      element.scale.z  // profondeur
    );
    
    const material = new THREE.MeshLambertMaterial({
      color: element.color || '#404040'
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Positionner la route
    mesh.position.set(
      element.position.x,
      element.position.y,
      element.position.z
    );
    
    // Appliquer les rotations correctes pour Three.js BoxGeometry
    console.log('🔍 Rotations du serveur:', element.rotation);
    console.log('🔍 Orientation metadata:', element.metadata?.orientation);
    console.log('🔍 Valeurs exactes - x:', element.rotation.x, 'y:', element.rotation.y, 'z:', element.rotation.z);
    
    // Pas de rotation nécessaire - la géométrie est créée avec les bonnes dimensions
    console.log('✅ Géométrie créée avec les bonnes dimensions selon l\'orientation');
    
    // Créer un groupe pour la route
    const roadGroup = new THREE.Group();
    roadGroup.add(mesh);
    
    // Ajouter une boîte de debug pour vérifier les dimensions
    this.addDebugBoundingBox(element, roadGroup);
    
    // Ajouter des propriétés pour le debug
    roadGroup.userData = {
      type: 'road',
      elementData: element,
      modelType: 'simple'
    };
    
    console.log("✅ Route simple créée:", {
      position: roadGroup.position,
      scale: roadGroup.scale,
      rotation: roadGroup.rotation,
      children: roadGroup.children.length
    });
    
    return roadGroup;
  }
}