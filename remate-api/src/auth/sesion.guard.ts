import { CanActivate, ExecutionContext, Injectable, createParamDecorator } from '@nestjs/common';
import { AuthService, Usuario } from './auth.service';

/** Exige una sesión válida en las peticiones HTTP y deja el usuario en request.usuario. */
@Injectable()
export class SesionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    req.usuario = await this.auth.verificar(AuthService.tokenDeCabecera(req.headers.authorization));
    return true;
  }
}

export const UsuarioActual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Usuario => ctx.switchToHttp().getRequest().usuario,
);
