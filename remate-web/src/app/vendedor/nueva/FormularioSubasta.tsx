"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tablero } from "@/components/Tablero";
import { bs, sumarMontos } from "@/lib/formato";
import { crearClienteSupabase } from "@/lib/supabase/cliente";

const duraciones = [
  { seg: 60, texto: "1 min" },
  { seg: 120, texto: "2 min" },
  { seg: 180, texto: "3 min" },
  { seg: 300, texto: "5 min" },
  { seg: 600, texto: "10 min" },
];

/** Acepta montos con hasta dos decimales y mayores que cero; devuelve el texto decimal normalizado. */
function leerMonto(texto: string): string | null {
  const limpio = texto.trim().replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(limpio)) return null;
  return Number(limpio) > 0 ? limpio : null;
}

export function FormularioSubasta({ tiendaId, tiendaNombre, categorias }: {
  tiendaId: string; tiendaNombre: string; categorias: { id: number; nombre: string }[];
}) {
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
    precio: precioN == null ? "Escribe un monto mayor que cero, con hasta dos decimales." : null,
    incremento: incrementoN == null ? "Escribe un monto mayor que cero, con hasta dos decimales." : null,
  };
  const valido = !errores.titulo && !errores.precio && !errores.incremento;
  const categoriaNombre = categorias.find((c) => c.id === categoriaId)?.nombre ?? null;

  async function guardar(estado: "programada" | "borrador") {
    setEnviado(true);
    setErrorGuardar(null);
    if (!valido) return;
    setGuardando(true);
    const supabase = crearClienteSupabase();
    const { data: producto, error: e1 } = await supabase
      .from("productos")
      .insert({ tienda_id: tiendaId, categoria_id: categoriaId || null, titulo: titulo.trim(), descripcion: descripcion.trim() || null })
      .select("id").single();
    if (e1 || !producto) {
      setGuardando(false);
      return setErrorGuardar("No se pudo guardar el producto. Revisa tu conexión e inténtalo de nuevo.");
    }
    const { data: subasta, error: e2 } = await supabase
      .from("subastas")
      .insert({ producto_id: producto.id, estado, precio_inicial: precioN, incremento_minimo: incrementoN, duracion_seg: duracion })
      .select("codigo_sala").single();
    setGuardando(false);
    if (e2 || !subasta) return setErrorGuardar("Se guardó el producto, pero no la subasta. Inténtalo de nuevo.");
    router.push(`/vendedor/sala/${subasta.codigo_sala}`);
    router.refresh();
  }

  return (
    <div className="sala">
      <aside className="sala-columna sala-tablero">
        <Tablero restante={duracion} s={{
          codigo_sala: "RM-·····", estado: "programada", precio_inicial: precioN ?? "0", incremento_minimo: incrementoN ?? "0",
          duracion_seg: duracion, cierra_en: null, oferta_vigente: null, total_pujas: 0, producto: titulo, descripcion: null,
          categoria: categoriaNombre, tienda: tiendaNombre, ciudad: "", postor_vigente: null, ganador: null, monto_ganador: null, ultimas_pujas: [],
        }} />
        <p className="texto-chico">Así verán los compradores el tablero de la sala antes de que la abras. El código se genera al guardar.</p>
        {precioN && incrementoN && (
          <p className="aviso aviso-neutro">
            La primera puja debe ser de al menos {bs(precioN)}. Si alguien ofrece {bs(precioN)}, la siguiente tendrá que ser de {bs(sumarMontos(precioN, incrementoN))} o más.
          </p>
        )}
      </aside>

      <form className="panel pila" style={{ gap: 22 }} onSubmit={(e) => { e.preventDefault(); void guardar("programada"); }} noValidate>
        <div className="campo">
          <label htmlFor="titulo">Producto</label>
          <input id="titulo" className="entrada" value={titulo} onChange={(e) => setTitulo(e.target.value)}
            placeholder="Sillón de lectura" maxLength={120} aria-invalid={enviado && !!errores.titulo} />
          {enviado && errores.titulo && <span className="error">{errores.titulo}</span>}
        </div>

        <div className="campo">
          <label htmlFor="categoria">Categoría</label>
          <select id="categoria" className="entrada" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : "")}>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            <option value="">Sin categoría</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="descripcion">Descripción <span className="texto-chico" style={{ fontWeight: 400 }}>opcional</span></label>
          <textarea id="descripcion" className="entrada" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Estado, medidas y detalles que mostrarás en el live" maxLength={2000} />
        </div>

        <div className="grilla-2">
          <div className="campo">
            <label htmlFor="precio">Precio inicial</label>
            <div className="entrada-moneda">
              <input id="precio" className="entrada" inputMode="decimal" value={precio}
                onChange={(e) => setPrecio(e.target.value)} placeholder="80" aria-invalid={enviado && !!errores.precio} />
            </div>
            {enviado && errores.precio ? <span className="error">{errores.precio}</span> : <span className="ayuda">Mínimo de la primera puja.</span>}
          </div>
          <div className="campo">
            <label htmlFor="incremento">Incremento mínimo</label>
            <div className="entrada-moneda">
              <input id="incremento" className="entrada" inputMode="decimal" value={incremento}
                onChange={(e) => setIncremento(e.target.value)} placeholder="10" aria-invalid={enviado && !!errores.incremento} />
            </div>
            {enviado && errores.incremento ? <span className="error">{errores.incremento}</span> : <span className="ayuda">Cuánto debe subir cada puja.</span>}
          </div>
        </div>

        <div className="campo">
          <span style={{ fontSize: 14, fontWeight: 600 }} id="duracion-etiqueta">Duración</span>
          <div className="segmentado" role="group" aria-labelledby="duracion-etiqueta">
            {duraciones.map((d) => (
              <button key={d.seg} type="button" aria-pressed={duracion === d.seg} onClick={() => setDuracion(d.seg)}>{d.texto}</button>
            ))}
          </div>
          <span className="ayuda">Empieza a contar cuando abras la sala. Si llega una puja en los últimos segundos, el cierre se ampliará; esa regla aún no tiene valores definidos.</span>
        </div>

        {errorGuardar && <p className="aviso aviso-error" role="alert">{errorGuardar}</p>}
        <hr className="separador" />
        <div className="fila envolver" style={{ gap: 10 }}>
          <button className="boton" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar lista para abrir"}</button>
          <button className="boton boton-secundario" type="button" disabled={guardando} onClick={() => void guardar("borrador")}>Guardar borrador</button>
          <Link className="boton boton-secundario" href="/vendedor" style={{ marginLeft: "auto" }}>Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
