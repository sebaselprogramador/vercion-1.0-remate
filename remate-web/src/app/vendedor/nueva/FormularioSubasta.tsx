"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bs, sumarMontos } from "@/lib/formato";
import { crearClienteSupabase } from "@/lib/supabase/cliente";

const duraciones = [
  { seg: 60, texto: "1 minuto" },
  { seg: 120, texto: "2 minutos" },
  { seg: 180, texto: "3 minutos" },
  { seg: 300, texto: "5 minutos" },
  { seg: 600, texto: "10 minutos" },
];

/** Acepta montos con hasta dos decimales y mayores que cero; devuelve el texto decimal normalizado. */
function leerMonto(texto: string): string | null {
  const limpio = texto.trim().replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(limpio)) return null;
  return Number(limpio) > 0 ? limpio : null;
}

export function FormularioSubasta({ tiendaId, categorias }: { tiendaId: string; categorias: { id: number; nombre: string }[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | "">(categorias[0]?.id ?? "");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [incremento, setIncremento] = useState("");
  const [duracion, setDuracion] = useState(180);
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  const precioN = leerMonto(precio);
  const incrementoN = leerMonto(incremento);
  const errores = {
    titulo: titulo.trim().length < 2 ? "Escribe el nombre del producto." : null,
    precio: precioN == null ? "Monto mayor que cero, con hasta dos decimales." : null,
    incremento: incrementoN == null ? "Monto mayor que cero, con hasta dos decimales." : null,
  };
  const valido = !errores.titulo && !errores.precio && !errores.incremento;
  const categoriaNombre = categorias.find((c) => c.id === categoriaId)?.nombre ?? "Sin categoría";

  async function guardar(estado: "programada" | "borrador") {
    setEnviado(true);
    setErrorGuardar(null);
    if (!valido) return;
    setGuardando(true);
    const supabase = crearClienteSupabase();
    const { data: producto, error: e1 } = await supabase
      .from("productos")
      .insert({ tienda_id: tiendaId, categoria_id: categoriaId || null, titulo: titulo.trim(), descripcion: descripcion.trim() || null })
      .select("id")
      .single();
    if (e1 || !producto) {
      setGuardando(false);
      return setErrorGuardar("No se pudo guardar el producto. Revisa tu conexión e inténtalo de nuevo.");
    }
    const { data: subasta, error: e2 } = await supabase
      .from("subastas")
      .insert({ producto_id: producto.id, estado, precio_inicial: precioN, incremento_minimo: incrementoN, duracion_seg: duracion })
      .select("codigo_sala")
      .single();
    setGuardando(false);
    if (e2 || !subasta) return setErrorGuardar("Se guardó el producto, pero no la subasta. Inténtalo de nuevo.");
    router.push(`/vendedor/sala?codigo=${subasta.codigo_sala}`);
  }

  return (
    <div className="grilla-2" style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", alignItems: "start", gap: 24 }}>
      <form className="tarjeta pila" style={{ gap: 20 }} onSubmit={(e) => { e.preventDefault(); void guardar("programada"); }} noValidate>
        <h1 className="titulo-seccion">Nueva subasta</h1>

        <div className="campo">
          <label htmlFor="titulo">Producto</label>
          <input id="titulo" className="entrada" value={titulo} onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Sillón de lectura" maxLength={120} aria-invalid={enviado && !!errores.titulo} />
          {enviado && errores.titulo && <span className="error">{errores.titulo}</span>}
        </div>

        <div className="grilla-2">
          <div className="campo">
            <label htmlFor="categoria">Categoría</label>
            <select id="categoria" className="entrada" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : "")}>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              <option value="">Sin categoría</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="duracion">Duración</label>
            <select id="duracion" className="entrada" value={duracion} onChange={(e) => setDuracion(Number(e.target.value))}>
              {duraciones.map((d) => <option key={d.seg} value={d.seg}>{d.texto}</option>)}
            </select>
            <span className="ayuda">Empieza a contar cuando abras la sala.</span>
          </div>
        </div>

        <div className="campo">
          <label htmlFor="descripcion">Descripción <span className="texto-chico">(opcional)</span></label>
          <textarea id="descripcion" className="entrada" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Estado, medidas, detalles que mostrarás en el live" maxLength={2000} />
        </div>

        <div className="grilla-2">
          <div className="campo">
            <label htmlFor="precio">Precio inicial (Bs)</label>
            <input id="precio" className="entrada cifra" inputMode="decimal" value={precio}
              onChange={(e) => setPrecio(e.target.value)} placeholder="80" aria-invalid={enviado && !!errores.precio} />
            {enviado && errores.precio ? <span className="error">{errores.precio}</span>
              : <span className="ayuda">La primera puja debe alcanzar este monto.</span>}
          </div>
          <div className="campo">
            <label htmlFor="incremento">Incremento mínimo (Bs)</label>
            <input id="incremento" className="entrada cifra" inputMode="decimal" value={incremento}
              onChange={(e) => setIncremento(e.target.value)} placeholder="10" aria-invalid={enviado && !!errores.incremento} />
            {enviado && errores.incremento ? <span className="error">{errores.incremento}</span>
              : <span className="ayuda">Cada puja debe superar la vigente al menos por este monto.</span>}
          </div>
        </div>

        <p className="aviso">Si llega una puja en los últimos segundos, el cierre se ampliará. Los segundos exactos de esa regla todavía no están definidos.</p>
        {errorGuardar && <p className="aviso aviso-alerta" role="alert">{errorGuardar}</p>}

        <div className="fila envolver" style={{ gap: 12 }}>
          <button className="boton" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar lista para abrir"}</button>
          <button className="boton boton-secundario" type="button" disabled={guardando} onClick={() => void guardar("borrador")}>Guardar como borrador</button>
          <Link className="boton boton-secundario" href="/vendedor">Cancelar</Link>
        </div>
      </form>

      <aside className="pila" style={{ gap: 16 }}>
        <div className="tarjeta pila" style={{ gap: 10 }}>
          <p className="texto-tenue">Así lo verán los compradores</p>
          <h2 className="titulo-tarjeta">{titulo.trim() || "Nombre del producto"}</h2>
          <span className="texto-chico">{categoriaNombre}</span>
          <hr className="separador" />
          <div className="fila entre">
            <div><p className="texto-chico">Precio inicial</p><p className="monto cifra">{bs(precioN)}</p></div>
            <div style={{ textAlign: "right" }}><p className="texto-chico">Incremento</p><p className="monto cifra">{bs(incrementoN)}</p></div>
          </div>
          {precioN && incrementoN && (
            <p className="texto-chico">Ejemplo: si la oferta vigente es {bs(precioN)}, la siguiente deberá ser de al menos {bs(sumarMontos(precioN, incrementoN))}.</p>
          )}
        </div>
        <div className="tarjeta pila" style={{ gap: 8 }}>
          <h3 className="titulo-tarjeta" style={{ fontSize: 16 }}>Reglas de la sala</h3>
          <p className="texto-tenue">Solo cuentan las pujas aceptadas en Remate, no los comentarios del live.</p>
          <p className="texto-tenue">No puedes pujar por tus propios productos.</p>
          <p className="texto-tenue">Si nadie puja, la subasta termina sin ganador.</p>
        </div>
      </aside>
    </div>
  );
}
