import {
  DatoInvalido, generarCodigoSala, leerCodigoSala, leerDuracion, leerIdSolicitud, leerMonto,
} from '../src/subastas/validacion';
import { LimitadorSolicitudes } from '../src/subastas/limitador';

describe('leerMonto: importes en bolivianos como decimal exacto', () => {
  it.each([
    ['130', '130'],
    ['130.5', '130.5'],
    ['130,50', '130.50'],
    [' 80 ', '80'],
    [95, '95'],
  ])('acepta %p', (entrada, esperado) => {
    expect(leerMonto(entrada)).toBe(esperado);
  });

  it.each(['0', '0.00', '-10', '10.005', 'abc', '', '1e3', null, undefined, '12345678901'])('rechaza %p', (entrada) => {
    expect(() => leerMonto(entrada)).toThrow(DatoInvalido);
  });
});

describe('leerCodigoSala', () => {
  it('normaliza a mayúsculas', () => expect(leerCodigoSala(' rm-4821 ')).toBe('RM-4821'));
  it.each(['4821', 'RM-12', 'XX-4821', 'RM-4821; drop table', 42])('rechaza %p', (c) => {
    expect(() => leerCodigoSala(c)).toThrow(DatoInvalido);
  });
});

describe('leerIdSolicitud', () => {
  it('acepta un UUID', () => {
    expect(leerIdSolicitud('3F2A9C1E-5B7D-4E8A-9C21-7D4E5F6A8B90')).toBe('3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90');
  });
  it('rechaza un texto cualquiera', () => expect(() => leerIdSolicitud('puja-1')).toThrow(DatoInvalido));
});

describe('leerDuracion', () => {
  it('acepta de 30 s a 1 h', () => expect(leerDuracion(180)).toBe(180));
  it.each([0, 29, 3601, 12.5, 'x'])('rechaza %p', (d) => expect(() => leerDuracion(d)).toThrow(DatoInvalido));
});

describe('generarCodigoSala', () => {
  it('cumple el formato de la base de datos', () => {
    for (let i = 0; i < 200; i++) expect(generarCodigoSala()).toMatch(/^RM-[0-9A-Z]{4,8}$/);
  });
});

describe('LimitadorSolicitudes', () => {
  it('permite hasta el máximo dentro de la ventana y luego rechaza', () => {
    const l = new LimitadorSolicitudes(3, 1000);
    expect([0, 10, 20, 30].map((t) => l.permitir('a', t))).toEqual([true, true, true, false]);
  });
  it('vuelve a permitir cuando pasa la ventana', () => {
    const l = new LimitadorSolicitudes(1, 1000);
    l.permitir('a', 0);
    expect(l.permitir('a', 500)).toBe(false);
    expect(l.permitir('a', 1001)).toBe(true);
  });
  it('cuenta por separado cada conexión', () => {
    const l = new LimitadorSolicitudes(1, 1000);
    expect(l.permitir('a', 0)).toBe(true);
    expect(l.permitir('b', 0)).toBe(true);
  });
});
