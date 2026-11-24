import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.VITE_STATIC_DEMO !== "true") {
  throw new Error(
    "Pages requires VITE_STATIC_DEMO=true. The backend is not hosted on GitHub Pages.",
  );
}
const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "frontend/dist");
const require = createRequire(join(root, "frontend/package.json"));
const swagger = dirname(require.resolve("swagger-ui-dist/package.json"));
const target = join(output, "swagger");
await mkdir(target, { recursive: true });
for (const asset of ["swagger-ui.css", "swagger-ui-bundle.js"]) {
  await copyFile(join(swagger, asset), join(target, asset));
}
await copyFile(
  join(root, "docs/swagger/index.html"),
  join(target, "index.html"),
);
const spec = JSON.parse(
  await readFile(join(root, "docs/openapi.json"), "utf8"),
);
if (!spec.openapi || !Object.keys(spec.paths ?? {}).length)
  throw new Error("Missing OpenAPI specification");
await writeFile(
  join(target, "openapi.json"),
  `${JSON.stringify(spec, null, 2)}\n`,
);
await writeFile(join(output, ".nojekyll"), "");
console.log(
  `GitHub Pages demo and Swagger ready: ${Object.keys(spec.paths).length} API paths`,
);
