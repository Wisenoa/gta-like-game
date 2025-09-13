# Backend - Serveur de Jeu Multijoueur

Serveur NestJS avec Fastify et Socket.io pour le jeu GTA-like multijoueur.

## Fonctionnalités

- **WebSocket temps réel** : Synchronisation des joueurs en temps réel
- **Gestion des rooms** : Système de salles de jeu
- **API REST** : Endpoints pour les données non-temps réel
- **Performance** : Utilise Fastify pour des performances optimales

## Installation

```bash
yarn install
```

## Démarrage

```bash
# Développement
yarn start:dev

# Production
yarn start:prod
```

## API Endpoints

### REST API
- `GET /api/health` - Statut du serveur
- `GET /api/rooms` - Liste des rooms
- `GET /api/rooms/:id` - Détails d'une room
- `GET /api/players` - Liste des joueurs connectés

### WebSocket Events

#### Client → Serveur
- `joinGame` - Rejoindre le jeu
- `playerMove` - Mettre à jour la position du joueur
- `getPlayers` - Demander la liste des joueurs

#### Serveur → Client
- `playerJoined` - Nouveau joueur connecté
- `playerDisconnected` - Joueur déconnecté
- `playerMoved` - Mise à jour de position d'un joueur
- `existingPlayers` - Liste des joueurs existants
- `playersList` - Liste complète des joueurs

## Structure

```
src/
├── game/           # Interfaces et DTOs
├── players/        # Service de gestion des joueurs
├── rooms/          # Service de gestion des rooms
├── events/         # Gateway WebSocket
└── main.ts         # Point d'entrée
```

## Configuration

Le serveur écoute sur le port 3001 par défaut et accepte les connexions depuis :
- http://localhost:3000 (Vite dev server)
- http://localhost:5173 (Vite dev server alternatif)