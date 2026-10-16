import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Roda antes de cada página: renova a sessão do Supabase (o token expira em 1 h) e
// controla o acesso. A RLS continua sendo a proteção real dos dados; isto é só navegação.
const PRIVADAS = ["/roteiros", "/nova-viagem", "/perfil", "/admin", "/agencia"];
const SO_DESLOGADO = ["/login", "/cadastro", "/verificar"];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista, headers) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // getUser valida o token no servidor do Supabase (getSession só lê o cookie)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const comeca = (lista: string[]) => lista.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && comeca(PRIVADAS)) {
    return redirecionar(request, response, `/login?next=${encodeURIComponent(pathname + search)}`);
  }
  if (user && comeca(SO_DESLOGADO)) {
    return redirecionar(request, response, "/roteiros");
  }
  return response;
}

/** Redireciona sem perder os cookies de sessão renovados acima. */
function redirecionar(request: NextRequest, response: NextResponse, destino: string) {
  const r = NextResponse.redirect(new URL(destino, request.url));
  response.cookies.getAll().forEach((c) => r.cookies.set(c));
  return r;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|maplibre-gl-worker.mjs|api/|auth/callback|exemplo).*)"],
};
