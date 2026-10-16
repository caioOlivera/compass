// Script "Drive" da Travelpayouts (verificação do site e links de afiliado automáticos).
// Só nas páginas públicas: nunca em login, conta ou pagamento. Liga com TRAVELPAYOUTS_DRIVE_URL.
// O React 19 leva <script async> para o <head>, onde a Travelpayouts procura.
export function ScriptAfiliados() {
  const src = process.env.TRAVELPAYOUTS_DRIVE_URL;
  if (!src || !/^https:\/\/[a-z0-9.-]+\/[\w./-]+(\?[\w=&.-]*)?$/i.test(src)) return null;
  return <script async src={src} data-cmp-ab="2" data-noptimize="1" data-cfasync="false" />;
}
