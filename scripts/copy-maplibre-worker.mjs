// O MapLibre 6 roda o processamento de tiles e GeoJSON num worker carregado de um arquivo
// separado, que o bundler do Next não publica. Copiamos o worker da versão instalada para
// public/ (o componente do mapa aponta para ele com setWorkerUrl).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkg = path.dirname(require.resolve("maplibre-gl/package.json"));
const destino = path.join(import.meta.dirname, "..", "public");

mkdirSync(destino, { recursive: true });
copyFileSync(path.join(pkg, "dist", "maplibre-gl-worker.mjs"), path.join(destino, "maplibre-gl-worker.mjs"));
