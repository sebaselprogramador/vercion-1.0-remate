import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function iniciar() {
  for (const v of ['DATABASE_URL', 'SUPABASE_URL']) {
    if (!process.env[v]) throw new Error(`Falta la variable de entorno ${v}. Revisa el archivo .env (ver .env.example).`);
  }
  const app = await NestFactory.create(AppModule);
  // WEB_ORIGIN admite varios orígenes separados por comas (por ejemplo, los puertos 3000 y 3001).
  app.enableCors({ origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim()) });
  app.enableShutdownHooks();
  const puerto = Number(process.env.PORT ?? 4000);
  await app.listen(puerto);
  new Logger('Remate').log(`Servidor de subastas escuchando en http://localhost:${puerto}`);
}

void iniciar();
