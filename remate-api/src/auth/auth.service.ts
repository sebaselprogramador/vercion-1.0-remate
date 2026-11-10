import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface Usuario {
  id: string;
  email?: string;
}

/**
 * Verifica la sesión emitida por Supabase Auth (token JWT) con las claves públicas del proyecto.
 * Autenticar una cuenta no equivale a verificar la identidad real de la persona.
 */
@Injectable()
export class AuthService {
  private readonly base = `${process.env.SUPABASE_URL}/auth/v1`;
  private readonly claves = createRemoteJWKSet(new URL(`${this.base}/.well-known/jwks.json`));

  async verificar(token: string | undefined | null): Promise<Usuario> {
    if (!token) throw new UnauthorizedException('sesion_requerida');
    try {
      const { payload } = await jwtVerify(token, this.claves, { issuer: this.base, audience: 'authenticated' });
      if (typeof payload.sub !== 'string') throw new Error('sin sub');
      return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined };
    } catch {
      throw new UnauthorizedException('sesion_invalida');
    }
  }

  static tokenDeCabecera(cabecera: string | undefined): string | null {
    const m = cabecera?.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : null;
  }
}
