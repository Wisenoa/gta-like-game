# GTA-Like Game

Un jeu 3D style GTA développé avec Three.js et JavaScript moderne.

## Fonctionnalités

- **Mouvement fluide** : Déplacement avec WASD, saut avec Espace, course avec Shift
- **Caméra à la première personne** : Contrôle de la vue avec la souris
- **Monde ouvert** : Ville avec bâtiments, routes, arbres et voitures
- **Physique simple** : Gravité et collision avec le sol
- **Éclairage réaliste** : Ombres et éclairage dynamique

## Installation

1. Assurez-vous d'avoir Node.js 20 installé :
```bash
nvm use 20
```

2. Installez les dépendances :
```bash
yarn install
```

3. Lancez le serveur de développement :
```bash
yarn dev
```

4. Ouvrez votre navigateur sur `http://localhost:3000`

## Contrôles

- **WASD** : Se déplacer
- **Souris** : Regarder autour
- **Espace** : Sauter
- **Shift** : Courir
- **Clic** : Verrouiller le curseur pour les contrôles de caméra

## Structure du projet

```
src/
├── core/           # Classes de base (Game, InputManager)
├── game/           # Logique du jeu (Player, World)
├── utils/          # Utilitaires
├── assets/         # Ressources (modèles, textures)
└── main.js         # Point d'entrée principal
```

## Technologies utilisées

- **Three.js** : Moteur 3D
- **Vite** : Build tool et serveur de développement
- **JavaScript ES6+** : Langage moderne
- **WebGL** : Rendu 3D dans le navigateur

## Développement

Pour construire le projet en production :
```bash
yarn build
```

Pour prévisualiser la version de production :
```bash
yarn preview
```

## Améliorations futures

- [ ] Système de physique plus avancé
- [ ] Véhicules pilotables
- [ ] IA pour les PNJ
- [ ] Système de mission
- [ ] Multi-joueur
- [ ] Sons et musique
- [ ] Effets visuels avancés
