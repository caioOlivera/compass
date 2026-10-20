import { NextResponse } from "next/server";
import { exportarDados } from "@/lib/lgpd";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/meus-dados — cópia dos dados da pessoa logada, em JSON (LGPD art. 18, II e V). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  const dados = await exportarDados(createAdminClient(), user);
  const dia = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="compass-meus-dados-${dia}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
