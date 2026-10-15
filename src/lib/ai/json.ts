import type { z } from "zod";
import { extrairJson, GeracaoError, type ChamadorModelo } from "@/lib/ai/generate";

// Tarefa genérica "texto → JSON validado": chama o modelo, valida com Zod e, se vier com problema,
// repete uma vez mandando o JSON anterior e os erros. Usado pela ingestão da base de conhecimento.

export type ResultadoJson<T> = {
  dados: T;
  modelo: string;
  tentativas: number;
  inputTokens: number;
  outputTokens: number;
};

export async function gerarJsonValidado<S extends z.ZodType>(opcoes: {
  chamar: ChamadorModelo;
  schema: S;
  mensagem: string;
  maxTentativas?: number;
}): Promise<ResultadoJson<z.infer<S>>> {
  const max = opcoes.maxTentativas ?? 2;
  let inputTokens = 0;
  let outputTokens = 0;
  let mensagem = opcoes.mensagem;

  for (let tentativa = 1; tentativa <= max; tentativa++) {
    const r = await opcoes.chamar(mensagem);
    inputTokens += r.inputTokens;
    outputTokens += r.outputTokens;
    if (r.parada === "recusa") throw new GeracaoError("recusa", "A IA recusou a tarefa.");

    const texto = extrairJson(r.texto);
    let erros: string[];
    if (r.parada === "tamanho") {
      erros = ["A resposta foi cortada por tamanho. Seja mais conciso: menos itens e textos mais curtos."];
    } else {
      try {
        const v = opcoes.schema.safeParse(JSON.parse(texto));
        if (v.success) return { dados: v.data, modelo: r.modelo, tentativas: tentativa, inputTokens, outputTokens };
        erros = v.error.issues.slice(0, 40).map((i) => `Campo ${i.path.join(".") || "(raiz)"}: ${i.message}`);
      } catch {
        erros = ["A resposta não era um JSON válido. Responda só com o objeto JSON."];
      }
    }

    if (tentativa === max) {
      throw new GeracaoError(r.parada === "tamanho" ? "truncado" : "invalido", "A IA não devolveu um JSON válido.", erros);
    }
    mensagem = [
      opcoes.mensagem,
      "Sua resposta anterior tem problemas:",
      `<resposta_anterior>\n${texto.slice(0, 60_000)}\n</resposta_anterior>`,
      `Corrija e devolva o objeto completo:\n${erros.map((e) => `- ${e}`).join("\n")}`,
    ].join("\n\n");
  }
  throw new Error("inalcançável");
}
