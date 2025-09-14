import * as THREE from 'three';

export class WorldGenerator {
    constructor() {
        this.WORLD_SIZE = 30; // 30x30 blocs
        this.BLOCK_SIZE = 1;
        this.BLOCK_HEIGHT = 1;
        
        // Géométrie et matériau pour les blocs
        this.blockGeometry = new THREE.BoxGeometry(this.BLOCK_SIZE, this.BLOCK_HEIGHT, this.BLOCK_SIZE);
        this.blockMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Couleur terre
    }

    /**
     * Crée le monde de blocs Minecraft
     * @param {THREE.Scene} scene - La scène Three.js
     * @param {Octree} worldOctree - L'Octree pour les collisions
     * @returns {THREE.Group} Le groupe contenant tous les blocs
     */
    createMinecraftWorld(scene, worldOctree) {
        const worldGroup = new THREE.Group();
        
        // Créer une map 30x30 de blocs de terre
        for (let x = 0; x < this.WORLD_SIZE; x++) {
            for (let z = 0; z < this.WORLD_SIZE; z++) {
                // Position du bloc
                const blockX = (x - this.WORLD_SIZE / 2) * this.BLOCK_SIZE;
                const blockZ = (z - this.WORLD_SIZE / 2) * this.BLOCK_SIZE;
                const blockY = 0; // Au niveau du sol
                
                // Créer le mesh du bloc
                const blockMesh = new THREE.Mesh(this.blockGeometry, this.blockMaterial);
                blockMesh.position.set(blockX, blockY, blockZ);
                blockMesh.castShadow = true;
                blockMesh.receiveShadow = true;
                
                // Ajouter le bloc au groupe
                worldGroup.add(blockMesh);
            }
        }
        
        // Ajouter le monde à la scène
        scene.add(worldGroup);
        
        // Construire l'Octree à partir du monde de blocs
        worldOctree.fromGraphNode(worldGroup);
        
        console.log(`Monde Minecraft créé avec ${this.WORLD_SIZE * this.WORLD_SIZE} blocs`);
        
        return worldGroup;
    }

    /**
     * Génère un bloc à une position donnée
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @param {number} z - Position Z
     * @param {string} blockType - Type de bloc (pour l'instant seulement 'dirt')
     * @returns {THREE.Mesh} Le mesh du bloc créé
     */
    generateBlock(x, y, z, blockType = 'dirt') {
        let material;
        
        switch (blockType) {
            case 'dirt':
                material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                break;
            default:
                material = this.blockMaterial;
        }
        
        const blockMesh = new THREE.Mesh(this.blockGeometry, material);
        blockMesh.position.set(x, y, z);
        blockMesh.castShadow = true;
        blockMesh.receiveShadow = true;
        
        return blockMesh;
    }

    /**
     * Obtient la taille du monde
     * @returns {number} La taille du monde (30x30)
     */
    getWorldSize() {
        return this.WORLD_SIZE;
    }

    /**
     * Obtient la taille d'un bloc
     * @returns {number} La taille d'un bloc
     */
    getBlockSize() {
        return this.BLOCK_SIZE;
    }
}
