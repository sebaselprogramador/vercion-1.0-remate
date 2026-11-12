"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logotipo } from "@/components/Logo";
import { useSesion } from "@/lib/sesion";

type Modo = "ingresar" | "registrarse";

/** Página a la que volver tras ingresar (solo rutas internas). Sin destino, cada rol va a su sección. */
export function destinoSeguro() {
  const v = new URLSearchParams(window.location.search).get("volver");
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/inicio";
}

/** Traduce los errores más comunes de Supabase Auth. */
function traducir(mensaje: string) {
  if (/invalid login credentials/i.test(mensaje)) return "Correo o contraseña incorrectos.";
  if (/already registered/i.test(mensaje)) return "Ya existe una cuenta con ese correo.";
  if (/password should be at least/i.test(mensaje)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/email not confirmed/i.test(mensaje)) return "Confirma tu correo con el enlace que te enviamos antes de ingresar.";
  if (/rate limit/i.test(mensaje)) return "Demasiados intentos. Espera unos minutos.";
  if (/failed to fetch|network|fetch failed|load failed/i.test(mensaje))
    return "No pudimos conectar con el servicio de cuentas. Revisa tu conexión a internet e inténtalo de nuevo.";
  return "No se pudo completar la operación. Inténtalo de nuevo.";
}

export function FormularioIngreso() {
  const router = useRouter();
  const { supabase, recargar } = useSesion();
  const [modo, setModo] = useState<Modo>("ingresar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function cambiarModo(m: Modo) {
    setModo(m);
    setError(null);
    setAviso(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      if (modo === "registrarse") {
        const { data, error } = await supabase.auth.signUp({
          email: correo.trim(),
          password: clave,
          options: { data: { nombre_visible: nombre.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setAviso("Te enviamos un correo para confirmar la cuenta. Ábrelo y luego ingresa.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
        if (error) throw error;
      }
      await recargar();
      router.push(destinoSeguro());
    } catch (err) {
      setError(traducir(err instanceof Error ? err.message : String(err)));
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="ingreso">
      <aside className="ingreso-marca">
        <div>
          <Logotipo ancho={150} color="#f3f4f1" />
          <p className="ingreso-lugar">Subastas en vivo · Cochabamba</p>
        </div>
        <svg className="ingreso-martillo" viewBox="0 0 40 40" aria-hidden="true">
          <g transform="rotate(-38 20 20)">
            <rect x="9" y="8" width="22" height="11" rx="3" fill="#c8ad7a" />
            <rect x="18.2" y="18" width="3.6" height="17" rx="1.8" fill="rgba(243,244,241,.18)" />
          </g>
        </svg>
      </aside>

      <section className="ingreso-panel">
        <form className="ingreso-caja" onSubmit={enviar}>
          <h1 className="titulo-seccion" style={{ fontSize: 30 }}>
            {modo === "ingresar" ? "Ingresa a tu cuenta" : "Crea tu cuenta"}
          </h1>
          <div className="ingreso-pestanas" role="tablist" aria-label="Ingresar o crear cuenta">
            <button type="button" role="tab" aria-selected={modo === "ingresar"} onClick={() => cambiarModo("ingresar")}>Ingresar</button>
            <button type="button" role="tab" aria-selected={modo === "registrarse"} onClick={() => cambiarModo("registrarse")}>Crear cuenta</button>
          </div>

          {modo === "registrarse" && (
            <div className="campo">
              <label htmlFor="nombre">Nombre visible</label>
              <input id="nombre" className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)}
                required maxLength={60} placeholder="Así te verán en las pujas" />
            </div>
          )}
          <div className="campo">
            <label htmlFor="correo">Correo</label>
            <input id="correo" type="email" autoComplete="email" className="entrada" value={correo}
              onChange={(e) => setCorreo(e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="clave">Contraseña</label>
            <input id="clave" type="password" className="entrada" value={clave} onChange={(e) => setClave(e.target.value)}
              autoComplete={modo === "ingresar" ? "current-password" : "new-password"} required minLength={6} />
          </div>

          {error && <p className="aviso aviso-alerta" role="alert">{error}</p>}
          {aviso && <p className="aviso" role="status">{aviso}</p>}

          <button className="boton boton-bloque" disabled={cargando}>
            {cargando ? "Un momento…" : modo === "ingresar" ? "Ingresar" : "Crear cuenta"}
          </button>
          <p className="texto-chico">
            {modo === "registrarse"
              ? "Tu cuenta empieza como comprador: puedes pujar en cualquier sala. Si registras una tienda, también podrás vender."
              : "Una cuenta identifica a quien puja; no verifica documentos de identidad."}
          </p>
        </form>
      </section>
    </main>
  );
}
