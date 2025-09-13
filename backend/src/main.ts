import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  
  // Configuration CORS pour le frontend (incluant ngrok et IP locale)
  app.enableCors({
    origin: [
      'http://localhost:3000', 
      'http://localhost:5173',
      'http://192.168.1.21:3000',  // IP locale frontend
      'http://192.168.1.21:5173',  // IP locale frontend (port alternatif)
      /^https:\/\/.*\.ngrok\.io$/,  // Autoriser tous les tunnels ngrok
      /^https:\/\/.*\.ngrok-free\.app$/  // Nouveau format ngrok
    ],
    credentials: true,
  });
  
  await app.listen(process.env.PORT ?? 3002, '0.0.0.0');
  console.log(`🚀 Serveur de jeu démarré sur le port ${process.env.PORT ?? 3002}`);
}
bootstrap();
