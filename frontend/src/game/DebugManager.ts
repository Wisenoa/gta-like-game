import * as THREE from "three";
import { MapElement, MapData } from "./World";

export class DebugManager {
  private debugLabels: THREE.Group = new THREE.Group();
  private debugMode: boolean = false;

  constructor() {
    // Le groupe de labels sera ajouté au groupe principal du monde
  }

  getDebugLabels(): THREE.Group {
    return this.debugLabels;
  }

  isDebugMode(): boolean {
    return this.debugMode;
  }

  toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
    console.log(`🐛 Mode debug: ${this.debugMode ? "ACTIVÉ" : "DÉSACTIVÉ"}`);
  }

  createDebugLabel(element: MapElement, object: THREE.Object3D, mapData?: MapData): void {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = 200;
    canvas.height = 60;

    // Style du label
    context.fillStyle = "rgba(0, 0, 0, 0.8)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "white";
    context.font = "10px Arial";
    context.textAlign = "center";

    // Texte du label avec plus d'informations
    const subtype = element.metadata?.roadType || element.type;
    const position = `(${element.position.x.toFixed(1)}, ${element.position.z.toFixed(1)})`;
    const scale = `${element.scale.x}x${element.scale.z}`;
    
    context.fillText(`${subtype}`, canvas.width / 2, 15);
    context.fillText(position, canvas.width / 2, 30);
    context.fillText(scale, canvas.width / 2, 45);

    // Créer la texture et le sprite
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Positionner le label au-dessus de l'élément
    sprite.position.set(
      element.position.x,
      element.position.y + element.scale.y / 2 + 3,
      element.position.z
    );

    // Redimensionner le sprite
    sprite.scale.set(2, 0.6, 1);

    // Ajouter des métadonnées pour identifier le label
    sprite.userData = {
      elementType: element.type,
      elementIndex: mapData?.elements.indexOf(element),
      elementPosition: element.position,
    };

    this.debugLabels.add(sprite);
  }

  clearDebugLabels(): void {
    this.debugLabels.clear();
  }

  enableWireframeMode(group: THREE.Group): void {
    console.log("🔍 Activation du mode wireframe...");
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.wireframe = true;
        // Ajouter des couleurs différentes pour distinguer les types
        const elementType =
          child.userData.elementType || child.parent?.userData.elementType;
        if (elementType === "road") {
          child.material.color.setHex(0xff0000); // Rouge pour les routes
        } else if (elementType === "ground") {
          child.material.color.setHex(0x00ff00); // Vert pour le sol
        }
      }
    });
  }

  disableWireframeMode(group: THREE.Group): void {
    console.log("🔍 Désactivation du mode wireframe...");
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.wireframe = false;
        // Restaurer les couleurs originales
        const elementType =
          child.userData.elementType || child.parent?.userData.elementType;
        if (elementType === "road") {
          child.material.color.setHex(0x2c2c2c); // Couleur route originale
        } else if (elementType === "ground") {
          child.material.color.setHex(0x8b8b8b); // Couleur sol originale
        }
      }
    });
  }

  showRoadPositions(group: THREE.Group): void {
    console.log("🛣️ Positions des routes:");
    let roadCount = 0;
    group.traverse((child) => {
      const elementType = child.userData.elementType;
      if (elementType === "road") {
        roadCount++;
        const boundingBox = new THREE.Box3().setFromObject(child);
        const size = boundingBox.getSize(new THREE.Vector3());
        const center = boundingBox.getCenter(new THREE.Vector3());
        
        console.log(`Route #${roadCount}:`, {
          position: {
            x: child.position.x.toFixed(2),
            y: child.position.y.toFixed(2),
            z: child.position.z.toFixed(2)
          },
          rotation: {
            x: child.rotation.x.toFixed(2),
            y: child.rotation.y.toFixed(2),
            z: child.rotation.z.toFixed(2)
          },
          scale: {
            x: child.scale.x.toFixed(2),
            y: child.scale.y.toFixed(2),
            z: child.scale.z.toFixed(2)
          },
          boundingBox: {
            size: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
            center: { x: center.x.toFixed(2), y: center.y.toFixed(2), z: center.z.toFixed(2) }
          },
          children: child.children.length,
          elementData: child.userData.elementPosition ? {
            x: child.userData.elementPosition.x.toFixed(2),
            y: child.userData.elementPosition.y.toFixed(2),
            z: child.userData.elementPosition.z.toFixed(2)
          } : "N/A"
        });
      }
    });
    console.log(`📊 Total des routes affichées: ${roadCount}`);
  }

  createAllDebugLabels(group: THREE.Group, mapData: MapData): void {
    if (!mapData) return;

    mapData.elements.forEach((element) => {
      // Trouver le mesh correspondant dans le groupe
      const mesh = group.children.find(
        (child) =>
          child instanceof THREE.Mesh &&
          Math.abs(child.position.x - element.position.x) < 0.1 &&
          Math.abs(child.position.y - element.position.y) < 0.1 &&
          Math.abs(child.position.z - element.position.z) < 0.1
      ) as THREE.Mesh;

      if (mesh) {
        this.createDebugLabel(element, mesh, mapData);
      }
    });
  }
}
