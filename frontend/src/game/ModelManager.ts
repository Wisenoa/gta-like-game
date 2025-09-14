import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ModelCache {
    [key: string]: THREE.Group;
}

export class ModelManager {
    private cache: ModelCache = {};
    private loader: GLTFLoader;
    private loadingPromises: { [key: string]: Promise<THREE.Group> } = {};

    constructor() {
        this.loader = new GLTFLoader();
    }

    /**
     * Charge un modèle GLB/GLTF et le met en cache
     */
    async loadModel(modelPath: string): Promise<THREE.Group> {
        // Si déjà en cache, retourner directement
        if (this.cache[modelPath]) {
            console.log(`📦 Modèle ${modelPath} trouvé en cache`);
            return this.cache[modelPath];
        }

        // Si déjà en cours de chargement, attendre la promesse existante
        if (this.loadingPromises.hasOwnProperty(modelPath)) {
            console.log(`⏳ Modèle ${modelPath} déjà en cours de chargement...`);
            return this.loadingPromises[modelPath]!;
        }

        // Créer une nouvelle promesse de chargement
        this.loadingPromises[modelPath] = new Promise((resolve, reject) => {
            console.log(`🔄 Début du chargement de ${modelPath}...`);
            
            this.loader.load(
                modelPath,
                (gltf) => {
                    console.log(`✅ Modèle ${modelPath} chargé avec succès`);
                    console.log(`📊 Détails du modèle:`, {
                        scenes: gltf.scenes?.length || 0,
                        animations: gltf.animations?.length || 0,
                        cameras: gltf.cameras?.length || 0,
                        materials: (gltf as any).materials?.length || 0,
                        textures: (gltf as any).textures?.length || 0
                    });
                    
                    // Debug: vérifier le contenu de la scène
                    if (gltf.scene) {
                        console.log(`🔍 Contenu de la scène:`, {
                            children: gltf.scene.children.length,
                            userData: gltf.scene.userData
                        });
                    }
                    
                    // Cloner le modèle pour éviter les conflits
                    const model = gltf.scene.clone();
                    
                    // Mettre en cache
                    this.cache[modelPath] = model;
                    
                    // Nettoyer la promesse
                    delete this.loadingPromises[modelPath];
                    
                    resolve(model);
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100).toFixed(1);
                    console.log(`🔄 Chargement ${modelPath}: ${percent}%`);
                },
                (error) => {
                    console.error(`❌ Erreur chargement modèle ${modelPath}:`, error);
                    delete this.loadingPromises[modelPath];
                    reject(error);
                }
            );
        });

        return this.loadingPromises[modelPath];
    }



    /**
     * Préchage des modèles essentiels
     */
    async preloadEssentialModels(): Promise<void> {
        console.log('🔄 Préchargement des modèles essentiels...');
        
        try {
            // Charger le modèle de route
            await this.loadModel('/models/low_road.glb');
            
            console.log('✅ Modèles essentiels préchargés');
        } catch (error) {
            console.warn('⚠️ Erreur lors du préchargement des modèles:', error);
        }
    }

    /**
     * Nettoie le cache
     */
    clearCache(): void {
        Object.values(this.cache).forEach(model => {
            model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });
        
        this.cache = {};
        console.log('🧹 Cache des modèles nettoyé');
    }
}
