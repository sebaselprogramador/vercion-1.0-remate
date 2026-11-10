import { Module } from '@nestjs/common';
import { DbService } from './db/db.service';
import { AuthService } from './auth/auth.service';
import { SesionGuard } from './auth/sesion.guard';
import { SubastasService } from './subastas/subastas.service';
import { SubastasController } from './subastas/subastas.controller';
import { SalasGateway } from './subastas/salas.gateway';
import { CierreService } from './subastas/cierre.service';

@Module({
  controllers: [SubastasController],
  providers: [DbService, AuthService, SesionGuard, SubastasService, SalasGateway, CierreService],
})
export class AppModule {}
