import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Para páginas e ações do painel: exige sessão e papel de admin (tabela admins, via is_admin()).
 * Quem não é admin recebe 404, para o painel não aparecer.
 */
export async function exigirAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/base");
  const { data: admin } = await supabase.rpc("is_admin");
  if (!admin) notFound();
  return { supabase, user };
}
