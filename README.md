# 🎮 GTA-Like Multiplayer Game

Un jeu multijoueur 3D style GTA développé avec Three.js et NestJS.

## 🚀 Fonctionnalités

### Frontend (Three.js + Vite)
- **Moteur 3D** : Three.js pour le rendu 3D
- **Contrôles FPS** : Système de visée style Call of Duty
- **Physique réaliste** : Gravité, friction, accélération
- **Système de stamina** : Sprint avec consommation d'énergie
- **Minimap** : Affichage en temps réel des joueurs et éléments du monde
- **Session persistante** : Reconnexion automatique
- **Interface moderne** : UI responsive avec statistiques en temps réel

### Backend (NestJS + Socket.io)
- **Serveur WebSocket** : Communication temps réel avec Socket.io
- **Gestion des joueurs** : Synchronisation des positions et rotations
- **Architecture modulaire** : Services séparés pour chaque fonctionnalité
- **CORS configuré** : Support pour ngrok et développement local

### Monde 3D
- **Route réaliste** : Route avec marquages et trottoirs
- **Bâtiments** : Immeubles avec fenêtres éclairées
- **Éclairage** : Lampadaires et feux de circulation
- **Panneaux** : Signalisation routière
- **Arbres** : Éléments de décoration

## 🛠️ Installation

### Prérequis
- Node.js 20+
- Yarn
- Ngrok (pour le multijoueur)

### Installation
```bash
# Cloner le repository
git clone <votre-repo>
cd gta-like

# Installer les dépendances frontend
cd frontend
yarn install

# Installer les dépendances backend
cd ../backend
yarn install

# Retourner à la racine
cd ..
```

## 🎯 Utilisation

### Développement local
```bash
# Terminal 1 - Backend
cd backend
yarn start:dev

# Terminal 2 - Frontend
cd frontend
yarn dev
```

### Multijoueur avec ngrok
```bash
# Utiliser le script automatisé
chmod +x start-with-ngrok.sh
./start-with-ngrok.sh
```

## 🎮 Contrôles

### Mouvement
- **WASD** : Se déplacer
- **Souris** : Regarder autour (style Call of Duty)
- **Espace** : Sauter
- **Shift** : Sprint (consomme stamina)
- **Clic** : Verrouiller le curseur

### Ajustements
- **+/-** : Ajuster la sensibilité de la souris
- **0** : Reset de la sensibilité

## 🏗️ Architecture

```
gta-like/
├── frontend/          # Application Three.js
│   ├── src/
│   │   ├── core/     # Services de base (Network, Input, Session)
│   │   ├── game/     # Logique de jeu (Player, World, Minimap)
│   │   └── main.ts   # Point d'entrée
│   └── package.json
├── backend/           # Serveur NestJS
│   ├── src/
│   │   ├── events/   # WebSocket Gateway
│   │   ├── players/  # Gestion des joueurs
│   │   └── game/     # Logique de jeu
│   └── package.json
└── README.md
```

## 🔧 Technologies

- **Frontend** : Three.js, Vite, TypeScript, Socket.io-client
- **Backend** : NestJS, Socket.io, TypeScript, Fastify
- **Réseau** : WebSocket pour la communication temps réel
- **Stockage** : localStorage pour la persistance des sessions

## 📝 Développement

### Ajout de fonctionnalités
1. **Frontend** : Ajouter les composants dans `src/game/`
2. **Backend** : Créer les services dans `src/`
3. **Réseau** : Utiliser les événements Socket.io existants

### Debug
- **Console** : Logs détaillés pour le debug
- **UI** : Statistiques en temps réel (FPS, position, stamina)
- **Minimap** : Visualisation des positions des joueurs

## 🚀 Déploiement

Le projet est conçu pour fonctionner avec ngrok pour le multijoueur :
1. Démarrer le backend local
2. Démarrer le frontend local
3. Exposer le frontend avec ngrok
4. Partager l'URL ngrok pour le multijoueur

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des fonctionnalités
- Soumettre des pull requests

---

**Amusez-vous bien ! 🎮✨**