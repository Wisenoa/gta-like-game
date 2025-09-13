import * as THREE from 'three';

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

export class World {
    group: THREE.Group;
    private mapData: MapData | null = null;
    private isMapLoaded = false;
    private mapDataCallback?: (data: MapData) => void;
    
    constructor() {
        this.group = new THREE.Group();
    }
    
    setMapDataCallback(callback: (data: MapData) => void) {
        this.mapDataCallback = callback;
    }
    
    receiveMapData(mapData: MapData) {
        console.log('🗺️ Réception des données de carte du serveur:', mapData);
        this.mapData = mapData;
        this.isMapLoaded = true;
        
        // Notifier le callback
        if (this.mapDataCallback) {
            this.mapDataCallback(mapData);
        }
    }
    
    async create() {
        if (!this.isMapLoaded) {
            console.log('⏳ En attente des données de carte du serveur...');
            return;
        }
        
        if (this.mapData) {
            this.createFromServerData();
        } else {
            this.createLocalMap();
        }
    }
    
    private createFromServerData() {
        if (!this.mapData) return;
        
        console.log('🏗️ Construction de la carte depuis les données serveur...');
        
        // Créer le sol de base
        this.createGround();
        
        // Créer tous les éléments de la carte
        this.mapData.elements.forEach((element, index) => {
            this.createElement(element);
        });
        
        console.log(`✅ Carte construite avec ${this.mapData.elements.length} éléments`);
    }
    
    private createElement(element: MapElement) {
        let geometry: THREE.BufferGeometry;
        let material: THREE.Material;
        
        switch (element.type) {
            case 'building':
                geometry = new THREE.BoxGeometry(element.scale.x, element.scale.y, element.scale.z);
                material = new THREE.MeshLambertMaterial({ 
                    color: element.color || '#666666' 
                });
                break;
                
            case 'road':
                geometry = new THREE.BoxGeometry(element.scale.x, element.scale.y, element.scale.z);
                material = new THREE.MeshLambertMaterial({ 
                    color: element.color || '#333333' 
                });
                break;
                
            case 'tree':
                geometry = new THREE.CylinderGeometry(0.3, 0.5, element.scale.y, 8);
                material = new THREE.MeshLambertMaterial({ 
                    color: element.color || '#2d5016' 
                });
                break;
                
            case 'lamp':
                geometry = new THREE.CylinderGeometry(0.1, 0.1, element.scale.y, 8);
                material = new THREE.MeshLambertMaterial({ 
                    color: element.color || '#666666' 
                });
                break;
                
            case 'car':
                geometry = new THREE.BoxGeometry(element.scale.x, element.scale.y, element.scale.z);
                material = new THREE.MeshLambertMaterial({ 
                    color: element.color || '#ff0000' 
                });
                break;
                
            default:
                return; // Type non reconnu
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(element.position.x, element.position.y, element.position.z);
        mesh.rotation.set(element.rotation.x, element.rotation.y, element.rotation.z);
        
        // Ajouter des ombres pour certains éléments
        if (element.type === 'building' || element.type === 'tree' || element.type === 'lamp') {
            mesh.castShadow = true;
        }
        if (element.type === 'road') {
            mesh.receiveShadow = true;
        }
        
        this.group.add(mesh);
    }
    
    private generateLocalMap() {
        console.log('🏗️ Génération de carte locale (fallback)...');
        this.createLocalMap();
    }
    
    private createLocalMap() {
        this.createGround();
        this.createBuildings();
        this.createStreet();
        this.createEnvironment();
    }
    
    createGround() {
        // Sol principal
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4a4a4a 
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.group.add(ground);
        
        // Herbe autour
        const grassGeometry = new THREE.PlaneGeometry(300, 300);
        const grassMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x228B22 
        });
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = -0.01;
        this.group.add(grass);
    }
    
    createStreet() {
        // Route principale (plus large)
        const roadGeometry = new THREE.PlaneGeometry(30, 200);
        const roadMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2C2C2C 
        });
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0.01;
        this.group.add(road);
        
        // Trottoirs
        this.createSidewalks();
        
        // Lignes blanches centrales (continues)
        for (let i = -90; i <= 90; i += 2) {
            const lineGeometry = new THREE.PlaneGeometry(0.3, 1.5);
            const lineMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xFFFFFF 
            });
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.rotation.x = -Math.PI / 2;
            line.position.set(0, 0.02, i);
            this.group.add(line);
        }
        
        // Lignes de bordure (discontinues)
        for (let i = -90; i <= 90; i += 8) {
            // Bordure droite
            for (let j = 0; j < 4; j++) {
                const lineGeometry = new THREE.PlaneGeometry(0.2, 1);
                const lineMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xFFFFFF 
                });
                const line = new THREE.Mesh(lineGeometry, lineMaterial);
                line.rotation.x = -Math.PI / 2;
                line.position.set(12, 0.02, i + j * 2);
                this.group.add(line);
            }
            
            // Bordure gauche
            for (let j = 0; j < 4; j++) {
                const lineGeometry = new THREE.PlaneGeometry(0.2, 1);
                const lineMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xFFFFFF 
            });
                const line = new THREE.Mesh(lineGeometry, lineMaterial);
                line.rotation.x = -Math.PI / 2;
                line.position.set(-12, 0.02, i + j * 2);
                this.group.add(line);
            }
        }
        
        // Feux de circulation
        this.createTrafficLights();
        
        // Panneaux de signalisation
        this.createRoadSigns();
        
        // Lampadaires
        this.createStreetLights();
    }
    
    createSidewalks() {
        // Trottoir droit
        const sidewalkGeometry = new THREE.PlaneGeometry(8, 200);
        const sidewalkMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B7355 
        });
        const rightSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        rightSidewalk.rotation.x = -Math.PI / 2;
        rightSidewalk.position.set(19, 0.005, 0);
        this.group.add(rightSidewalk);
        
        // Trottoir gauche
        const leftSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        leftSidewalk.rotation.x = -Math.PI / 2;
        leftSidewalk.position.set(-19, 0.005, 0);
        this.group.add(leftSidewalk);
        
        // Bordures de trottoir
        this.createSidewalkBorders();
    }
    
    createSidewalkBorders() {
        // Bordure droite
        const borderGeometry = new THREE.BoxGeometry(0.2, 0.3, 200);
        const borderMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x666666 
        });
        const rightBorder = new THREE.Mesh(borderGeometry, borderMaterial);
        rightBorder.position.set(15, 0.15, 0);
        this.group.add(rightBorder);
        
        // Bordure gauche
        const leftBorder = new THREE.Mesh(borderGeometry, borderMaterial);
        leftBorder.position.set(-15, 0.15, 0);
        this.group.add(leftBorder);
    }
    
    createTrafficLights() {
        const positions = [
            { x: 15, z: -50 },
            { x: -15, z: -50 },
            { x: 15, z: 50 },
            { x: -15, z: 50 }
        ];
        
        positions.forEach(pos => {
            this.createTrafficLight(pos.x, pos.z);
        });
    }
    
    createTrafficLight(x, z) {
        const trafficLightGroup = new THREE.Group();
        
        // Poteau
        const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4);
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 2;
        trafficLightGroup.add(pole);
        
        // Boîtier des feux
        const boxGeometry = new THREE.BoxGeometry(0.8, 2, 0.3);
        const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.y = 3.5;
        trafficLightGroup.add(box);
        
        // Feux (rouge, orange, vert)
        const lightColors = [0xFF0000, 0xFFA500, 0x00FF00];
        const lightPositions = [0.3, 0, -0.3];
        
        lightColors.forEach((color, index) => {
            const lightGeometry = new THREE.SphereGeometry(0.15);
            const lightMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                emissive: color,
                emissiveIntensity: 0.3
            });
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(0, lightPositions[index], 0.2);
            trafficLightGroup.add(light);
        });
        
        trafficLightGroup.position.set(x, 0, z);
        this.group.add(trafficLightGroup);
    }
    
    createRoadSigns() {
        const signs = [
            { x: 20, z: -30, text: "STOP", color: 0xFF0000 },
            { x: -20, z: -30, text: "STOP", color: 0xFF0000 },
            { x: 20, z: 30, text: "50", color: 0x0000FF },
            { x: -20, z: 30, text: "50", color: 0x0000FF }
        ];
        
        signs.forEach(sign => {
            this.createRoadSign(sign.x, sign.z, sign.text, sign.color);
        });
    }
    
    createRoadSign(x, z, text, color) {
        const signGroup = new THREE.Group();
        
        // Poteau
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2);
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 1;
        signGroup.add(pole);
        
        // Panneau
        const signGeometry = new THREE.PlaneGeometry(1.5, 1);
        const signMaterial = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.9
        });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.y = 2;
        signGroup.add(sign);
        
        // Texte sur le panneau (simplifié avec un cube coloré)
        const textGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.1);
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const textCube = new THREE.Mesh(textGeometry, textMaterial);
        textCube.position.set(0, 2, 0.06);
        signGroup.add(textCube);
        
        signGroup.position.set(x, 0, z);
        this.group.add(signGroup);
    }
    
    createStreetLights() {
        // Lampadaires le long de la route
        for (let z = -80; z <= 80; z += 20) {
            this.createStreetLight(18, z);  // Côté droit
            this.createStreetLight(-18, z);  // Côté gauche
        }
    }
    
    createStreetLight(x, z) {
        const lightGroup = new THREE.Group();
        
        // Poteau
        const poleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 6);
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 3;
        lightGroup.add(pole);
        
        // Bras du lampadaire
        const armGeometry = new THREE.BoxGeometry(2, 0.1, 0.1);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.position.set(1, 5.5, 0);
        arm.rotation.z = -0.2;
        lightGroup.add(arm);
        
        // Lumière
        const lightGeometry = new THREE.SphereGeometry(0.3);
        const lightMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFAA,
            emissive: 0xFFFFAA,
            emissiveIntensity: 0.5
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(2, 5.5, 0);
        lightGroup.add(light);
        
        // Cône de lumière (effet visuel)
        const coneGeometry = new THREE.ConeGeometry(1, 3, 8);
        const coneMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFAA,
            transparent: true,
            opacity: 0.1
        });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.set(2, 3, 0);
        cone.rotation.x = Math.PI;
        lightGroup.add(cone);
        
        lightGroup.position.set(x, 0, z);
        this.group.add(lightGroup);
    }
    
    createBuildings() {
        const buildingPositions = [
            // Bâtiments côté gauche
            { x: -45, z: -30, width: 15, height: 20, depth: 15 },
            { x: -45, z: 30, width: 18, height: 15, depth: 18 },
            { x: -60, z: 0, width: 10, height: 18, depth: 10 },
            { x: -60, z: -60, width: 12, height: 25, depth: 12 },
            { x: -60, z: 60, width: 14, height: 30, depth: 14 },
            
            // Bâtiments côté droit
            { x: 45, z: -30, width: 12, height: 25, depth: 12 },
            { x: 45, z: 30, width: 16, height: 22, depth: 16 },
            { x: 60, z: 0, width: 16, height: 22, depth: 16 },
            { x: 60, z: -60, width: 10, height: 18, depth: 10 },
            { x: 60, z: 60, width: 18, height: 15, depth: 18 }
        ];
        
        buildingPositions.forEach(pos => {
            this.createBuilding(pos.x, pos.z, pos.width, pos.height, pos.depth);
        });
    }
    
    createBuilding(x, z, width, height, depth) {
        const buildingGroup = new THREE.Group();
        
        // Structure principale
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.1, 0.3, 0.4)
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = height / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        buildingGroup.add(building);
        
        // Fenêtres
        for (let i = 0; i < Math.floor(height / 3); i++) {
            for (let j = 0; j < Math.floor(width / 2); j++) {
                this.createWindow(buildingGroup, width, height, depth, i, j);
            }
        }
        
        buildingGroup.position.set(x, 0, z);
        this.group.add(buildingGroup);
    }
    
    createWindow(buildingGroup, width, height, depth, floor, windowIndex) {
        const windowGeometry = new THREE.PlaneGeometry(1.5, 2);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: Math.random() > 0.5 ? 0x87CEEB : 0xFFD700,
            transparent: true,
            opacity: 0.8
        });
        
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
            -width/2 + 2 + windowIndex * 2,
            -height/2 + 2 + floor * 3,
            depth/2 + 0.01
        );
        buildingGroup.add(window);
    }
    
    createEnvironment() {
        // Arbres
        for (let i = 0; i < 20; i++) {
            this.createTree(
                (Math.random() - 0.5) * 150,
                (Math.random() - 0.5) * 150
            );
        }
        
        // Voitures (simplifiées)
        for (let i = 0; i < 5; i++) {
            this.createCar(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 180
            );
        }
    }
    
    createTree(x, z) {
        const treeGroup = new THREE.Group();
        
        // Tronc
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        // Feuillage
        const leavesGeometry = new THREE.SphereGeometry(2);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 4;
        leaves.castShadow = true;
        treeGroup.add(leaves);
        
        treeGroup.position.set(x, 0, z);
        this.group.add(treeGroup);
    }
    
    createCar(x, z) {
        const carGroup = new THREE.Group();
        
        // Corps de la voiture
        const carGeometry = new THREE.BoxGeometry(4, 1.5, 2);
        const carMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
        });
        const car = new THREE.Mesh(carGeometry, carMaterial);
        car.position.y = 0.75;
        car.castShadow = true;
        carGroup.add(car);
        
        // Roues
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        const wheelPositions = [
            { x: -1.2, y: 0.4, z: -0.8 },
            { x: 1.2, y: 0.4, z: -0.8 },
            { x: -1.2, y: 0.4, z: 0.8 },
            { x: 1.2, y: 0.4, z: 0.8 }
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            carGroup.add(wheel);
        });
        
        carGroup.position.set(x, 0, z);
        this.group.add(carGroup);
    }
}
