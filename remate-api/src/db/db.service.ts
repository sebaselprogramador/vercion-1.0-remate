import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, types } from 'pg';

// numeric llega como texto: los importes nunca se convierten a punto flotante.
types.setTypeParser(1700, (v) => v);

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });

  async consulta<T = Record<string, unknown>>(sql: string, parametros: unknown[] = []): Promise<T[]> {
    const r = await this.pool.query(sql, parametros);
    return r.rows as T[];
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
