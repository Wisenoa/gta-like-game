import * as THREE from "three";

export interface MapElement {
  type: "road" | "ground";
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color?: string;
  metadata?: any;
}

export class GroundManager {
  createComplexGround(element: MapElement): THREE.Group {
    const ground = new THREE.Group();

    // Base du sol uniquement - pas de détails
    const groundGeometry = new THREE.PlaneGeometry(
      element.scale.x,
      element.scale.z
    );
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b8b8b, // Gris clair
      shininess: 0,
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    ground.add(groundMesh);

    // Positionner le sol
    ground.position.set(
      element.position.x,
      element.position.y,
      element.position.z
    );
    ground.rotation.set(
      element.rotation.x,
      element.rotation.y,
      element.rotation.z
    );

    // Ajouter des métadonnées pour le debug
    ground.userData.elementType = element.type;

    return ground;
  }

  private addGroundDetails(
    ground: THREE.Group,
    scale: { x: number; y: number; z: number }
  ): void {
    // Rochers
    for (let i = 0; i < 5; i++) {
      const rockGeometry = new THREE.SphereGeometry(0.2, 6, 4);
      const rockMaterial = new THREE.MeshPhongMaterial({ color: 0x696969 });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(
        (Math.random() - 0.5) * scale.x * 0.8,
        0.2,
        (Math.random() - 0.5) * scale.z * 0.8
      );
      rock.scale.set(
        0.5 + Math.random() * 0.5,
        0.3 + Math.random() * 0.3,
        0.5 + Math.random() * 0.5
      );
      ground.add(rock);
    }

    // Touffes d'herbe
    for (let i = 0; i < 8; i++) {
      const grassGeometry = new THREE.ConeGeometry(0.1, 0.3, 4);
      const grassMaterial = new THREE.MeshPhongMaterial({ color: 0x32cd32 });
      const grass = new THREE.Mesh(grassGeometry, grassMaterial);
      grass.position.set(
        (Math.random() - 0.5) * scale.x * 0.9,
        0.15,
        (Math.random() - 0.5) * scale.z * 0.9
      );
      ground.add(grass);
    }

    // Fleurs
    for (let i = 0; i < 3; i++) {
      const flowerGeometry = new THREE.SphereGeometry(0.05, 6, 4);
      const flowerMaterial = new THREE.MeshPhongMaterial({
        color: Math.random() > 0.5 ? 0xff69b4 : 0xffd700,
      });
      const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
      flower.position.set(
        (Math.random() - 0.5) * scale.x * 0.8,
        0.05,
        (Math.random() - 0.5) * scale.z * 0.8
      );
      ground.add(flower);
    }
  }
}
