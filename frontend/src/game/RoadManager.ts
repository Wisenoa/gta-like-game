import * as THREE from "three";
import { ModelManager } from "./ModelManager";

export interface MapElement {
  type: "road" | "ground" | "streetlight" | "building";
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color?: string;
  metadata?: {
    roadType?: 'main' | 'secondary' | 'residential' | 'highway';
    roadCondition?: 'new' | 'worn' | 'damaged';
    roadStyle?: 'asphalt' | 'concrete' | 'cobblestone';
    streetlightType?: 'modern' | 'classic' | 'vintage';
    hasLight?: boolean;
    lightColor?: string;
    lightIntensity?: number;
    orientation?: 'horizontal' | 'vertical';
    side?: 'left' | 'right';
    isElevated?: boolean;
    buildingType?: 'residential' | 'commercial' | 'office';
    floors?: number;
    hasWindows?: boolean;
    roofType?: 'flat' | 'sloped' | 'gabled';
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
    
    // Utilisons les routes simples qui fonctionnent bien
    console.log("🔄 Utilisation des routes simples");
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

  private createRoadMaterial(element: MapElement): THREE.MeshLambertMaterial {
    const metadata = element.metadata || {};
    const roadType = metadata.roadType || 'main';
    const roadCondition = metadata.roadCondition || 'new';
    
    // Créer une texture canvas personnalisée
    const canvas = document.createElement('canvas');
    const size = 256; // Taille de la texture
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Couleurs de base selon le type de route
    let baseColor: string;
    let lineColor: string;
    
    if (roadType === 'main') {
      baseColor = '#2a2a2a'; // Gris foncé pour les routes principales
      lineColor = '#ffffff'; // Lignes blanches
    } else {
      baseColor = '#404040'; // Gris moyen pour les routes secondaires
      lineColor = '#cccccc'; // Lignes grises
    }
    
    // Couleur selon l'état de la route
    if (roadCondition === 'worn') {
      baseColor = '#555555'; // Plus clair si usée
    } else if (roadCondition === 'damaged') {
      baseColor = '#666666'; // Encore plus clair si endommagée
    }
    
    // Dessiner le fond
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);
    
    // Dessiner les lignes de route
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    
    if (roadType === 'main') {
      // Routes principales : ligne centrale continue (horizontale)
      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();
      
      // Bordures
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.1);
      ctx.lineTo(size, size * 0.1);
      ctx.moveTo(0, size * 0.9);
      ctx.lineTo(size, size * 0.9);
      ctx.stroke();
    } else {
      // Routes secondaires : lignes discontinues (horizontales)
      const dashLength = 20;
      const gapLength = 15;
      
      ctx.lineWidth = 1;
      ctx.setLineDash([dashLength, gapLength]);
      
      // Ligne centrale
      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();
      
      ctx.setLineDash([]); // Reset
    }
    
    // Ajouter des détails selon l'état
    if (roadCondition === 'worn') {
      // Ajouter des taches d'usure
      ctx.fillStyle = '#777777';
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = Math.random() * 10 + 5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (roadCondition === 'damaged') {
      // Ajouter des fissures
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * size, Math.random() * size);
        ctx.lineTo(Math.random() * size, Math.random() * size);
        ctx.stroke();
      }
    }
    
    // Créer la texture Three.js
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    // Répéter la texture selon la taille de la route
    const repeatX = element.scale.x / 10; // Répéter tous les 10 unités
    const repeatY = element.scale.z / 10;
    texture.repeat.set(repeatX, repeatY);
    
    // Ajuster la rotation de la texture selon l'orientation de la route
    if (element.metadata?.orientation === 'vertical') {
      texture.rotation = Math.PI / 2; // Rotation de 90° pour les routes verticales
    } else {
      texture.rotation = 0; // Pas de rotation pour les routes horizontales
    }
    
    
    return new THREE.MeshLambertMaterial({
      map: texture,
      color: baseColor
    });
  }


  private async createGLBRoad(element: MapElement): Promise<THREE.Group> {
    
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
    
    // Appliquer directement les valeurs du serveur - pas de transformations supplémentaires
    roadInstance.position.set(
      element.position.x,
      element.position.y,
      element.position.z
    );
    
    roadInstance.rotation.set(
      element.rotation.x - Math.PI / 2, // Coucher sur le sol
      element.rotation.y,
      element.rotation.z
    );
    
    roadInstance.scale.set(
      element.scale.x,
      element.scale.y,
      element.scale.z
    );
    
    console.log("🔧 Valeurs appliquées directement du serveur:", {
      position: element.position,
      rotation: element.rotation,
      scale: element.scale
    });
    
    // Ajouter une boîte de debug pour vérifier les proportions
    this.addDebugBoundingBox(element, roadInstance);
    
    // Créer un groupe pour la route
    const roadGroup = new THREE.Group();
    roadGroup.add(roadInstance);
    
    console.log("✅ Route GLB créée avec géométrie originale et transformations");
    
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
    
    // Créer la géométrie directement avec les dimensions du serveur
    const geometry = new THREE.BoxGeometry(
      element.scale.x, // largeur
      element.scale.y, // hauteur  
      element.scale.z  // profondeur
    );
    
    // Créer une texture personnalisée selon le type de route
    const material = this.createRoadMaterial(element);
    
    const mesh = new THREE.Mesh(geometry, material);

    // Positionner la route
    mesh.position.set(
      element.position.x,
      element.position.y,
      element.position.z
    );
    
    // Pas de rotation nécessaire - la géométrie est créée avec les bonnes dimensions
    
    // Créer un groupe pour la route
    const roadGroup = new THREE.Group();
    roadGroup.add(mesh);
    
    // Debug désactivé pour les performances
    
    // Ajouter des propriétés pour le debug
    roadGroup.userData = {
      type: 'road',
      elementData: element,
      modelType: 'simple'
    };
    
    
    return roadGroup;
  }

  createStreetlight(element: MapElement): THREE.Group {
    const streetlightGroup = new THREE.Group();
    
    // === POTEAU SIMPLIFIÉ ===
    const poleGeometry = new THREE.CylinderGeometry(
      element.scale.x / 2, // rayon du haut
      element.scale.x * 1.1, // légèrement plus large en bas
      element.scale.y * 0.7, // hauteur réduite
      6 // moins de segments pour les performances
    );
    
    const poleMaterial = new THREE.MeshLambertMaterial({
      color: '#B0B0B0'
    });
    
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = element.scale.y * 0.35;
    streetlightGroup.add(pole);
    
    // === BRAS SIMPLE ===
    const armLength = element.scale.x * 6; // Bras plus court
    const armGeometry = new THREE.CylinderGeometry(
      element.scale.x / 4, // plus fin
      element.scale.x / 4,
      armLength,
      4 // moins de segments
    );
    
    const armMaterial = new THREE.MeshLambertMaterial({
      color: '#A0A0A0'
    });
    
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.position.set(armLength / 2, element.scale.y * 0.6, 0);
    arm.rotation.z = Math.PI / 2;
    streetlightGroup.add(arm);
    
    // === LAMPE SIMPLE ===
    const lampGeometry = new THREE.SphereGeometry(element.scale.x * 1.2, 6, 4); // Moins de segments
    const lampMaterial = new THREE.MeshLambertMaterial({
      color: '#FFFFCC',
      emissive: '#FFFFAA',
      emissiveIntensity: 0.3 // Réduit
    });
    
    const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
    lamp.position.set(armLength, element.scale.y * 0.6, 0);
    streetlightGroup.add(lamp);
    
    // === BASE SIMPLE ===
    const baseGeometry = new THREE.CylinderGeometry(
      element.scale.x * 1.3,
      element.scale.x * 1.5,
      element.scale.y * 0.15,
      6 // Moins de segments
    );
    
    const baseMaterial = new THREE.MeshLambertMaterial({
      color: '#909090'
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = element.scale.y * 0.075;
    streetlightGroup.add(base);
    
    // Positionner le lampadaire
    streetlightGroup.position.set(
      element.position.x,
      element.position.y,
      element.position.z
    );
    
    // Propriétés
    streetlightGroup.userData = {
      type: 'streetlight',
      elementData: element,
      hasLight: false // Désactivé pour les performances
    };
    
    // Éclairage désactivé pour les performances
    // Les lampadaires sont maintenant purement décoratifs
    
    return streetlightGroup;
  }

  createBuilding(element: MapElement): THREE.Group {
    const buildingGroup = new THREE.Group();
    
    // === STRUCTURE PRINCIPALE (MURS EXTÉRIEURS) ===
    const buildingGeometry = new THREE.BoxGeometry(
      element.scale.x,
      element.scale.y,
      element.scale.z
    );
    
    const buildingMaterial = new THREE.MeshLambertMaterial({
      color: element.color || '#8B4513'
    });
    
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = element.scale.y / 2; // Le bâtiment commence au sol et monte
    buildingGroup.add(building);
    
    // === MURS INTÉRIEURS ===
    this.createInteriorWalls(element, buildingGroup);
    
    // === INTÉRIEUR ===
    this.createBuildingInterior(element, buildingGroup);
    
    // === FENÊTRES EXTERNES ===
    if (element.metadata?.hasWindows) {
      const floors = element.metadata.floors || 2;
      const windowSize = element.scale.x * 0.15;
      const windowSpacing = element.scale.x * 0.25;
      
      for (let floor = 0; floor < floors; floor++) {
        const floorHeight = element.scale.y / floors;
        const floorY = floor * floorHeight + floorHeight / 2;
        
        // Fenêtres sur la face avant (Z+)
        for (let i = 0; i < 3; i++) {
          const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize * 0.8);
          const windowMaterial = new THREE.MeshLambertMaterial({
            color: '#87CEEB',
            transparent: true,
            opacity: 0.7
          });
          
          const window = new THREE.Mesh(windowGeometry, windowMaterial);
          window.position.set(
            (i - 1) * windowSpacing,
            floorY,
            element.scale.z / 2 + 0.01
          );
          buildingGroup.add(window);
        }
        
        // Fenêtres sur la face arrière (Z-)
        for (let i = 0; i < 3; i++) {
          const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize * 0.8);
          const windowMaterial = new THREE.MeshLambertMaterial({
            color: '#87CEEB',
            transparent: true,
            opacity: 0.7
          });
          
          const window = new THREE.Mesh(windowGeometry, windowMaterial);
          window.position.set(
            (i - 1) * windowSpacing,
            floorY,
            -element.scale.z / 2 - 0.01
          );
          window.rotation.y = Math.PI;
          buildingGroup.add(window);
        }
      }
    }
    
    // === PORTE D'ENTRÉE OUVERTE ===
    const doorGeometry = new THREE.PlaneGeometry(element.scale.x * 0.2, element.scale.y * 0.4);
    const doorMaterial = new THREE.MeshLambertMaterial({
      color: '#654321' // Brun foncé pour la porte
    });
    
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(element.scale.x * 0.1, element.scale.y * 0.2, element.scale.z / 2 + 0.01);
    door.rotation.y = Math.PI / 4; // Porte ouverte à 45°
    buildingGroup.add(door);
    
    // === TOIT ===
    if (element.metadata?.roofType === 'flat') {
      const roofGeometry = new THREE.BoxGeometry(
        element.scale.x * 1.1,
        element.scale.y * 0.1,
        element.scale.z * 1.1
      );
      
      const roofMaterial = new THREE.MeshLambertMaterial({
        color: '#696969'
      });
      
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = element.scale.y + element.scale.y * 0.05;
      buildingGroup.add(roof);
    }
    
    // Positionner le bâtiment
    buildingGroup.position.set(
      element.position.x,
      element.position.y,
      element.position.z
    );
    
    // Propriétés
    buildingGroup.userData = {
      type: 'building',
      elementData: element,
      floors: element.metadata?.floors || 2
    };
    
    return buildingGroup;
  }

  // Créer les murs intérieurs visibles
  private createInteriorWalls(element: MapElement, buildingGroup: THREE.Group): void {
    const wallThickness = 0.1;
    const wallColor = '#F5DEB3'; // Beige clair pour les murs intérieurs
    
    // Mur arrière (Z-)
    const backWallGeometry = new THREE.PlaneGeometry(element.scale.x, element.scale.y);
    const backWallMaterial = new THREE.MeshLambertMaterial({ color: wallColor });
    const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
    backWall.position.set(0, element.scale.y / 2, -element.scale.z / 2 - wallThickness / 2);
    backWall.rotation.y = Math.PI;
    buildingGroup.add(backWall);
    
    // Mur gauche (X-)
    const leftWallGeometry = new THREE.PlaneGeometry(element.scale.z, element.scale.y);
    const leftWallMaterial = new THREE.MeshLambertMaterial({ color: wallColor });
    const leftWall = new THREE.Mesh(leftWallGeometry, leftWallMaterial);
    leftWall.position.set(-element.scale.x / 2 - wallThickness / 2, element.scale.y / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    buildingGroup.add(leftWall);
    
    // Mur droit (X+)
    const rightWallGeometry = new THREE.PlaneGeometry(element.scale.z, element.scale.y);
    const rightWallMaterial = new THREE.MeshLambertMaterial({ color: wallColor });
    const rightWall = new THREE.Mesh(rightWallGeometry, rightWallMaterial);
    rightWall.position.set(element.scale.x / 2 + wallThickness / 2, element.scale.y / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    buildingGroup.add(rightWall);
    
    // Mur avant partiel (Z+) - laisse l'espace pour la porte
    const frontWallLeftGeometry = new THREE.PlaneGeometry(element.scale.x * 0.4, element.scale.y);
    const frontWallLeftMaterial = new THREE.MeshLambertMaterial({ color: wallColor });
    const frontWallLeft = new THREE.Mesh(frontWallLeftGeometry, frontWallLeftMaterial);
    frontWallLeft.position.set(-element.scale.x * 0.3, element.scale.y / 2, element.scale.z / 2 + wallThickness / 2);
    buildingGroup.add(frontWallLeft);
    
    const frontWallRightGeometry = new THREE.PlaneGeometry(element.scale.x * 0.4, element.scale.y);
    const frontWallRightMaterial = new THREE.MeshLambertMaterial({ color: wallColor });
    const frontWallRight = new THREE.Mesh(frontWallRightGeometry, frontWallRightMaterial);
    frontWallRight.position.set(element.scale.x * 0.3, element.scale.y / 2, element.scale.z / 2 + wallThickness / 2);
    buildingGroup.add(frontWallRight);
  }

  // Créer l'intérieur du bâtiment
  private createBuildingInterior(element: MapElement, buildingGroup: THREE.Group): void {
    const floors = element.metadata?.floors || 2;
    const floorHeight = element.scale.y / floors;
    
    for (let floor = 0; floor < floors; floor++) {
      const floorY = floor * floorHeight;
      
      // === SOL DE L'ÉTAGE ===
      const floorGeometry = new THREE.PlaneGeometry(
        element.scale.x * 0.9, // Légèrement plus petit que les murs
        element.scale.z * 0.9
      );
      const floorMaterial = new THREE.MeshLambertMaterial({
        color: '#D2B48C' // Beige pour le sol
      });
      
      const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
      floorMesh.position.set(0, floorY + 0.01, 0);
      floorMesh.rotation.x = -Math.PI / 2; // Rotation pour être horizontal
      buildingGroup.add(floorMesh);
      
      // === PLAFOND ===
      const ceilingGeometry = new THREE.PlaneGeometry(
        element.scale.x * 0.9,
        element.scale.z * 0.9
      );
      const ceilingMaterial = new THREE.MeshLambertMaterial({
        color: '#F5F5DC' // Beige clair pour le plafond
      });
      
      const ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
      ceilingMesh.position.set(0, floorY + floorHeight - 0.01, 0);
      ceilingMesh.rotation.x = Math.PI / 2; // Rotation pour être horizontal
      buildingGroup.add(ceilingMesh);
      
      // === MEUBLES SIMPLES ===
      this.addFurniture(element, buildingGroup, floorY, floorHeight);
      
      // === FENÊTRES INTÉRIEURES ===
      this.addInteriorWindows(element, buildingGroup, floorY, floorHeight);
    }
  }

  // Ajouter des meubles simples
  private addFurniture(element: MapElement, buildingGroup: THREE.Group, floorY: number, floorHeight: number): void {
    const furnitureY = floorY + 0.1;
    
    // === TABLE ===
    const tableGeometry = new THREE.BoxGeometry(
      element.scale.x * 0.3, // Largeur
      element.scale.y * 0.05, // Hauteur (très basse)
      element.scale.z * 0.2  // Profondeur
    );
    const tableMaterial = new THREE.MeshLambertMaterial({
      color: '#8B4513' // Brun pour la table
    });
    
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, furnitureY + element.scale.y * 0.025, 0);
    buildingGroup.add(table);
    
    // === CHAISES ===
    const chairGeometry = new THREE.BoxGeometry(
      element.scale.x * 0.08,
      element.scale.y * 0.15,
      element.scale.z * 0.08
    );
    const chairMaterial = new THREE.MeshLambertMaterial({
      color: '#654321' // Brun foncé pour les chaises
    });
    
    // 4 chaises autour de la table
    const chairPositions = [
      { x: element.scale.x * 0.15, z: 0 },
      { x: -element.scale.x * 0.15, z: 0 },
      { x: 0, z: element.scale.z * 0.1 },
      { x: 0, z: -element.scale.z * 0.1 }
    ];
    
    chairPositions.forEach(pos => {
      const chair = new THREE.Mesh(chairGeometry, chairMaterial);
      chair.position.set(pos.x, furnitureY + element.scale.y * 0.075, pos.z);
      buildingGroup.add(chair);
    });
    
    // === LIT (seulement au rez-de-chaussée) ===
    if (floorY === 0) {
      const bedGeometry = new THREE.BoxGeometry(
        element.scale.x * 0.25,
        element.scale.y * 0.1,
        element.scale.z * 0.4
      );
      const bedMaterial = new THREE.MeshLambertMaterial({
        color: '#FFB6C1' // Rose clair pour le lit
      });
      
      const bed = new THREE.Mesh(bedGeometry, bedMaterial);
      bed.position.set(element.scale.x * 0.25, furnitureY + element.scale.y * 0.05, element.scale.z * 0.2);
      buildingGroup.add(bed);
    }
  }

  // Ajouter des fenêtres intérieures
  private addInteriorWindows(element: MapElement, buildingGroup: THREE.Group, floorY: number, floorHeight: number): void {
    const windowSize = element.scale.x * 0.12;
    const windowY = floorY + floorHeight * 0.6; // Position des fenêtres
    
    // Fenêtres intérieures sur les côtés
    const sideWindowGeometry = new THREE.PlaneGeometry(windowSize, windowSize * 0.6);
    const sideWindowMaterial = new THREE.MeshLambertMaterial({
      color: '#E6E6FA', // Lavande clair pour l'intérieur
      transparent: true,
      opacity: 0.8
    });
    
    // Fenêtres sur les côtés gauche et droit
    const sidePositions = [
      { x: -element.scale.x * 0.45, z: 0, rotY: Math.PI / 2 },
      { x: element.scale.x * 0.45, z: 0, rotY: -Math.PI / 2 }
    ];
    
    sidePositions.forEach(pos => {
      const window = new THREE.Mesh(sideWindowGeometry, sideWindowMaterial);
      window.position.set(pos.x, windowY, pos.z);
      window.rotation.y = pos.rotY;
      buildingGroup.add(window);
    });
  }
}