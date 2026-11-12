"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/sesion";

/** Registra la tienda de la cuenta actual. La base cambia el rol a "vendedor" en la misma operación. */
export function FormularioTienda() {
  const router = useRouter();
  const { supabase, recargar } = useSesion();
  const [nombre, setNombre] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = nombre.trim();
    const t = tiktok.trim();
    if (n.length < 2 || n.length > 80) return setError("El nombre debe tener entre 2 y 80 caracteres.");
    if (t && !/^@?[A-Za-z0-9._]{2,24}$/.test(t)) return setError("Usuario de TikTok no válido. Ejemplo: @casanorte.cbba");
    setCargando(true);
    const { error } = await supabase.rpc("registrar_tienda", { p_nombre: n, p_usuario_tiktok: t || null });
    setCargando(false);
    if (error) return setError(error.message.includes("duplicate") ? "Tu cuenta ya tiene una tienda." : "No se pudo registrar la tienda.");
    await recargar(); // el rol pasó a "vendedor"
    router.push("/vendedor");
  }

  return (
    <form className="panel pila" style={{ gap: 16 }} onSubmit={enviar} noValidate>
      <h2 className="titulo-seccion" style={{ fontSize: 22 }}>Registrar mi tienda</h2>
      <div className="campo">
        <label htmlFor="nombre">Nombre de la tienda</label>
        <input id="nombre" className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Casa Norte" maxLength={80} />
      </div>
      <div className="campo">
        <label htmlFor="tiktok">Usuario de TikTok <span className="texto-chico" style={{ fontWeight: 400 }}>opcional</span></label>
        <input id="tiktok" className="entrada" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@casanorte.cbba" />
        <span className="ayuda">Solo se muestra como referencia. Remate no se conecta a tu cuenta de TikTok.</span>
      </div>
      {error && <p className="aviso aviso-error" role="alert">{error}</p>}
      <button className="boton boton-grande" disabled={cargando}>{cargando ? "Registrando…" : "Registrar tienda"}</button>
      <p className="texto-chico">Tu cuenta pasará a ser de vendedor. Podrás crear subastas, pero no pujar en las tuyas.</p>
    </form>
  );
}
