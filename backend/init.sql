-- Script d'initialisation pour la base de données GTA-like
-- Ce script s'exécute automatiquement au premier démarrage du conteneur

-- Créer la base de données si elle n'existe pas
SELECT 'CREATE DATABASE gta_like_game'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'gta_like_game')\gexec

-- Se connecter à la base de données
\c gta_like_game;

-- Créer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Commentaire sur la base de données
COMMENT ON DATABASE gta_like_game IS 'Base de données pour le jeu GTA-like multijoueur';
