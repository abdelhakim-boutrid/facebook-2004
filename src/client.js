import { createClient } from "@supabase/supabase-js";
export const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);
export const db = configured
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
  : null;
export const esc = (v = "") =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export async function result(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export function friendly(error) {
  const text = error?.message || "Une erreur est survenue. Réessaie.";
  if (text.includes("Invalid login credentials"))
    return "Adresse e-mail ou mot de passe incorrect.";
  if (text.includes("Email not confirmed"))
    return "Confirme ton adresse e-mail avant de te connecter.";
  if (text.includes("rate limit"))
    return "Trop de tentatives. Patiente un instant avant de réessayer.";
  if (text.includes("duplicate key")) return "Cette demande existe déjà.";
  if (text.includes("row-level security") || text.includes("permission denied"))
    return "Cette action n’est pas autorisée.";
  if (text.includes("Failed to fetch"))
    return "Connexion impossible. Vérifie ta connexion internet et la configuration Supabase.";
  return text;
}
