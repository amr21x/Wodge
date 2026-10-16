import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const workspaces = [];
for (const parent of ["apps", "packages", "config"]) {
  for (const entry of await readdir(path.join(root, parent), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(root, parent, entry.name);
    const manifest = JSON.parse(
      await readFile(path.join(directory, "package.json"), "utf8"),
    );
    workspaces.push({ directory, manifest });
  }
}
const byName = new Map(
  workspaces.map((workspace) => [workspace.manifest.name, workspace]),
);
const errors = [];
let files = 0;

async function inspect(directory, owner) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      ["node_modules", ".next", ".partykit", ".wrangler", "dist"].includes(
        entry.name,
      )
    )
      continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(filename, owner);
      continue;
    }
    if (!/\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    files++;
    const source = ts.createSourceFile(
      filename,
      await readFile(filename, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const fail = (message) =>
      errors.push(`${path.relative(root, filename)}: ${message}`);
    const check = (specifier) => {
      const name = specifier.split("/").slice(0, 2).join("/");
      if (specifier.startsWith("@wodge/")) {
        const dependency = byName.get(name);
        if (!dependency) return fail(`Unknown workspace package ${name}`);
        if (
          name !== owner.manifest.name &&
          !owner.manifest.dependencies?.[name] &&
          !owner.manifest.devDependencies?.[name]
        ) {
          fail(`Undeclared workspace dependency ${name}`);
        }
        const subpath =
          specifier === name ? "." : `.${specifier.slice(name.length)}`;
        const exports = dependency.manifest.exports;
        const exportKey =
          exports &&
          (subpath in exports
            ? subpath
            : Object.keys(exports)
                .filter((key) => {
                  const [prefix, suffix] = key.split("*");
                  return (
                    suffix !== undefined &&
                    subpath.startsWith(prefix) &&
                    subpath.endsWith(suffix)
                  );
                })
                .sort((a, b) => b.length - a.length)[0]);
        if (
          exports &&
          (exportKey === undefined || exports[exportKey] === null)
        ) {
          fail(`Private or missing package export ${specifier}`);
        }
      }
      if (
        owner.manifest.name === "@wodge/domain" &&
        !specifier.startsWith(".")
      ) {
        const packageName = specifier.startsWith("@")
          ? name
          : specifier.split("/")[0];
        if (
          !owner.manifest.dependencies?.[packageName] ||
          /^(?:react|replicache|next|partykit|drizzle-orm\/d1|node:)/.test(
            specifier,
          )
        ) {
          fail(`Domain imports a runtime dependency: ${specifier}`);
        }
      }
      if (
        specifier.startsWith(".") &&
        !/[/\\](?:tests|__tests__)[/\\]/.test(filename)
      ) {
        const target = path.resolve(path.dirname(filename), specifier);
        if (
          workspaces.some(
            (workspace) =>
              workspace !== owner &&
              target.startsWith(`${workspace.directory}${path.sep}`),
          )
        ) {
          fail(
            `Relative import bypasses another workspace's public API: ${specifier}`,
          );
        }
      }
    };
    const visit = (node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        check(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        check(node.arguments[0].text);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}

for (const workspace of workspaces)
  await inspect(workspace.directory, workspace);
assert.equal(errors.length, 0, errors.join("\n"));
console.log(
  `Pass: workspace declarations, public exports and domain boundaries (${files} source files)`,
);
