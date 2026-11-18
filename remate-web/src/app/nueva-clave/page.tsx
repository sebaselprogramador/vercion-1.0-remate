"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logotipo } from "@/components/Logo";
import { useSesion } from "@/lib/sesion";

type Estado = "revisando" | "formulario" | "invalido" | "listo";

/**
 * Destino del enlace del correo "recuperar contraseña". El enlace puede traer:
 *  - token_hash y type=recovery (plantilla de Remate): se verifica aquí, sirve aunque se abra en otro dispositivo;
 *  - code o tokens (enlace por defecto de Supabase): el cliente de Supabase crea la sesión solo.
 * Con la sesión de recuperación, la persona elige su contraseña nueva.
 */
export default function NuevaClave() {
  const router = useRouter();
  const { supabase, recargar } = useSesion();
  const [estado, setEstado] = useState<Estado>("revisando");
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    (async () => {
      const p = new URLSearchParams(window.location.search + "&" + window.location.hash.replace(/^#/, ""));
      if (p.get("error") || p.get("error_code")) return vigente && setEstado("invalido");
      const tokenHash = p.get("token_hash");
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        return vigente && setEstado(error ? "invalido" : "formulario");
      }
      // Enlace por defecto: se espera a que el cliente cree la sesión desde la dirección.
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return vigente && setEstado("formulario");
        await new Promise((r) => setTimeout(r, 300));
      }
      if (vigente) setEstado("invalido");
    })();
    return () => { vigente = false; };
  }, [supabase]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (clave.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (clave !== repetir) return setError("Las dos contraseñas no coinciden.");
    setGuardando(true);
    const { error } = await supabase.auth.updateUser({ password: clave });
    setGuardando(false);
    if (error) {
      return setError(/different from the old/i.test(error.message)
        ? "La contraseña nueva debe ser distinta de la anterior."
        : "No se pudo cambiar la contraseña. Pide un enlace nuevo e inténtalo otra vez.");
    }
    setEstado("listo");
  }

  return (
    <main className="confirmado">
      <div className="confirmado-caja">
        <Logotipo ancho={150} />
        {estado === "revisando" && <p className="texto-tenue" role="status">Revisando el enlace…</p>}

        {estado === "invalido" && (
          <>
            <h1 className="titulo-seccion" style={{ fontSize: 24 }}>El enlace no es válido</h1>
            <p className="texto-tenue">Venció o ya fue usado. Pide uno nuevo desde «¿Olvidaste tu contraseña?» en la pantalla de ingreso.</p>
            <button className="boton" onClick={() => router.push("/ingresar")}>Ir a ingresar</button>
          </>
        )}

        {estado === "formulario" && (
          <form className="pila" style={{ gap: 14, width: "100%", textAlign: "left" }} onSubmit={guardar}>
            <h1 className="titulo-seccion" style={{ fontSize: 24, textAlign: "center" }}>Crea tu contraseña nueva</h1>
            <div className="campo">
              <label htmlFor="clave">Contraseña nueva</label>
              <input id="clave" type="password" className="entrada" autoComplete="new-password" minLength={6} required
                value={clave} onChange={(e) => setClave(e.target.value)} />
              <span className="ayuda">Al menos 6 caracteres.</span>
            </div>
            <div className="campo">
              <label htmlFor="repetir">Repite la contraseña</label>
              <input id="repetir" type="password" className="entrada" autoComplete="new-password" minLength={6} required
                value={repetir} onChange={(e) => setRepetir(e.target.value)} />
            </div>
            {error && <p className="aviso aviso-alerta" role="alert">{error}</p>}
            <button className="boton boton-bloque" disabled={guardando}>{guardando ? "Guardando…" : "Guardar contraseña"}</button>
          </form>
        )}

        {estado === "listo" && (
          <>
            <div className="confirmado-sello" aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </div>
            <h1 className="titulo-seccion" style={{ fontSize: 24 }}>Tu contraseña fue cambiada</h1>
            <p className="texto-tenue">Ya puedes usarla para ingresar a Remate.</p>
            <button className="boton" onClick={async () => { await recargar(); router.push("/inicio"); }}>Entrar a Remate</button>
          </>
        )}
      </div>
    </main>
  );
}
