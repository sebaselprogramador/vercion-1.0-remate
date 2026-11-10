"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** Página a la que volver tras ingresar (solo rutas internas). */
function destinoSeguro() {
  const v = new URLSearchParams(window.location.search).get("volver");
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}
import type { User } from "@supabase/supabase-js";
import { crearClienteSupabase } from "@/lib/supabase/cliente";

type Modo = "ingresar" | "registrarse";

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

export default function Ingresar() {
  const router = useRouter();
  const [supabase] = useState(crearClienteSupabase);
  const [modo, setModo] = useState<Modo>("ingresar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUsuario(data.user));
    const { data } = supabase.auth.onAuthStateChange((_e, sesion) => setUsuario(sesion?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

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
        if (!data.session) setAviso("Te enviamos un correo para confirmar la cuenta. Ábrelo y luego ingresa.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
        if (error) throw error;
        router.push(destinoSeguro());
        router.refresh();
      }
    } catch (err) {
      setError(traducir(err instanceof Error ? err.message : String(err)));
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="marco-movil pila" style={{ gap: 20, paddingTop: 48 }}>
      <Link href="/" className="marca">remate.</Link>

      {usuario ? (
        <section className="tarjeta pila" style={{ gap: 12 }}>
          <h1 className="titulo-tarjeta">Sesión iniciada</h1>
          <p className="texto-tenue">{usuario.email}</p>
          <div className="grilla-2" style={{ gap: 10 }}>
            <Link className="boton" href="/">Ir a la vitrina</Link>
            <Link className="boton boton-secundario" href="/vendedor">Panel del vendedor</Link>
          </div>
          <button className="boton boton-secundario" onClick={async () => { await supabase.auth.signOut(); router.refresh(); }}>Cerrar sesión</button>
        </section>
      ) : (
        <form className="tarjeta pila" style={{ gap: 16 }} onSubmit={enviar}>
          <div className="fila" style={{ gap: 8 }}>
            <button type="button" className={`chip ${modo === "ingresar" ? "chip-activo" : ""}`} onClick={() => setModo("ingresar")}>Ingresar</button>
            <button type="button" className={`chip ${modo === "registrarse" ? "chip-activo" : ""}`} onClick={() => setModo("registrarse")}>Crear cuenta</button>
          </div>
          <h1 className="titulo-seccion" style={{ fontSize: 24 }}>
            {modo === "ingresar" ? "Ingresa para pujar" : "Crea tu cuenta"}
          </h1>

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
          <p className="texto-chico">Una cuenta identifica a quien puja; no verifica documentos de identidad.</p>
        </form>
      )}
    </main>
  );
}
