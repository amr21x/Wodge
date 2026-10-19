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
    const backendRegistrationFile =
      filename === path.join(owner.directory, "src/container.ts") ||
      filename.startsWith(path.join(owner.directory, "src/di") + path.sep);
    const coreRepositoryFile = /[/\\]repositories[/\\][^/\\]+\.ts$/.test(
      filename,
    );
    const fail = (message) =>
      errors.push(`${path.relative(root, filename)}: ${message}`);
    if (
      owner.manifest.name === "@wodge/core" &&
      filename.includes("/src/") &&
      !coreRepositoryFile &&
      /\b(?:nextVersion|lastModifiedVersion|lastMutationID|clientGroupID|Replicache|HonoRequest)\b/.test(
        source.text,
      )
    )
      fail("Application contains transport bookkeeping");
    if (
      /^index\.[jt]sx?$/.test(entry.name) &&
      source.statements.some(
        (node) => ts.isExportDeclaration(node) && node.moduleSpecifier,
      )
    )
      fail(
        "Index barrel files are not used; import the owning module directly",
      );
    if (
      filename.includes("/src/servers/") &&
      /\.resolve\s*\(|createRuntimeContainer|DependencyContainer/.test(
        source.text,
      )
    )
      fail(
        "Servers receive initialized instances; container access belongs in di/runtime.ts",
      );
    if (filename.includes("/src/") && /@scoped\s*\(/.test(source.text))
      fail(
        "Class lifetimes must be explicitly registered in backend DI modules",
      );
    if (filename.includes("/src/service-callers/"))
      fail(
        "Service callers were removed; inject core services through container.ts",
      );
    if (
      owner.manifest.name === "backend" &&
      filename.includes("/src/") &&
      !backendRegistrationFile &&
      /\.register(?:Instance)?\s*\(|\.provide(?:Factory|Value|Class)\s*\(|\.inject\s*=|\binject\s*:\s*\[/.test(
        source.text,
      )
    )
      fail(
        "Register backend dependencies only in container.ts and its di modules",
      );
    if (owner.manifest.name === "web" && filename.includes("/src/app/api/")) {
      fail("Application API routes belong in backend");
    }
    if (owner.manifest.name === "@wodge/core" && filename.includes("/src/")) {
      for (const declaration of source.statements.filter(
        ts.isClassDeclaration,
      )) {
        const name = declaration.name?.text ?? "";
        if (
          (coreRepositoryFile && !name.endsWith("Repository")) ||
          /(?:Queries|Store)$/.test(name)
        )
          fail(
            "Persistence classes use the Repository suffix and repositories/ folder",
          );
      }
    }
    const check = (specifier) => {
      if (specifier.includes("service-callers/"))
        fail("Import uses the removed service-callers layer");
      if (
        owner.manifest.name === "backend" &&
        filename.includes("/src/") &&
        /^reflect-metadata$/.test(specifier) &&
        !backendRegistrationFile &&
        !filename.endsWith("/src/server.ts") &&
        !filename.endsWith("/src/types/http.ts") &&
        !filename.endsWith("/src/types/dependencies.ts")
      )
        fail("Load reflection support only at the backend DI entrypoint");
      if (
        owner.manifest.name === "web" &&
        filename.includes("/src/") &&
        !/^@wodge\/core\/(?:(?:pages|rooms|discussions|workspace)\/mutations\/|features\/(?:flags|policy)$)/.test(
          specifier,
        ) &&
        /^(?:@wodge\/(?:core|infra)(?:\/|$)|@wodge\/auth\/(?:server|tickets|membership)(?:\/|$)|(?:tsyringe|reflect-metadata)(?:\/|$)|@supabase\/|better-auth(?:$|\/(?!react|client)))/.test(
          specifier,
        )
      )
        fail(`Web imports backend implementation: ${specifier}`);
      if (owner.manifest.name === "web" && filename.includes("/src/app/api/"))
        fail("Application API routes belong in backend");
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
        filename.startsWith(path.join(owner.directory, "src") + path.sep) &&
        !specifier.startsWith(".")
      ) {
        const packageName = specifier.startsWith("@")
          ? name
          : specifier.split("/")[0];
        if (
          (packageName !== owner.manifest.name &&
            !owner.manifest.dependencies?.[packageName]) ||
          /^(?:react|replicache|next|partykit|drizzle-orm\/d1|better-auth|@wodge\/auth|node:)/.test(
            specifier,
          )
        ) {
          fail(`Domain imports a runtime dependency: ${specifier}`);
        }
      }
      if (
        owner.manifest.name === "@wodge/core" &&
        filename.startsWith(path.join(owner.directory, "src") + path.sep) &&
        /^(?:hono(?:\/|$)|partykit(?:\/|$)|partyserver(?:\/|$)|next(?:\/|$)|react(?:\/|$)|replicache(?:\/|$)|@cloudflare\/next-on-pages(?:\/|$)|@wodge\/env(?:\/|$))/.test(
          specifier,
        )
      ) {
        fail(`Core imports host, transport or browser code: ${specifier}`);
      }
      const productionSource = filename.startsWith(
        path.join(owner.directory, "src") + path.sep,
      );
      if (
        productionSource &&
        owner.manifest.name === "@wodge/core" &&
        !coreRepositoryFile &&
        /^(?:@wodge\/auth(?:\/|$)|better-auth(?:\/|$)|reflect-metadata(?:\/|$)|@aws-sdk\/|stripe(?:\/|$)|jose(?:\/|$)|@cloudflare\/)/.test(
          specifier,
        )
      )
        fail(
          `Core imports authentication or provider implementation: ${specifier}`,
        );
      if (
        productionSource &&
        owner.manifest.name === "@wodge/core" &&
        specifier.startsWith("@wodge/infra/") &&
        !coreRepositoryFile
      )
        fail(
          `Only core repositories depend on infrastructure persistence types: ${specifier}`,
        );
      if (
        productionSource &&
        owner.manifest.name === "@wodge/infra" &&
        specifier.startsWith("@wodge/core/")
      )
        fail(`Infrastructure must not depend on core: ${specifier}`);
      if (
        productionSource &&
        owner.manifest.name === "@wodge/infra" &&
        specifier !== "@wodge/env/server" &&
        /^(?:@\/|next(?:\/|$)|partykit(?:\/|$)|hono(?:\/|$)|react(?:\/|$)|@wodge\/env(?:\/|$))/.test(
          specifier,
        )
      )
        fail(`Infrastructure imports host or transport code: ${specifier}`);
      if (
        productionSource &&
        owner.manifest.name === "backend" &&
        /[/\\]handlers[/\\]/.test(filename) &&
        /@wodge\/core\/[^/]+\/repositories\//.test(specifier)
      )
        fail(
          "Handlers coordinate services; repository modules are consumed by services only",
        );
      if (
        productionSource &&
        owner.manifest.name === "backend" &&
        /^(?:@aws-sdk\/|@supabase\/|better-auth(?:\/|$)|@better-auth\/|drizzle-orm(?:\/|$)|jose(?:\/|$)|stripe(?:\/|$)|livekit-server-sdk(?:\/|$))/.test(
          specifier,
        )
      ) {
        fail(`Backend bypasses provider package: ${specifier}`);
      }
      if (
        productionSource &&
        owner.manifest.name === "web" &&
        /^(?:drizzle-orm(?:\/|$)|@wodge\/domain\/(?:persistence\/|(?:user|workspace)\/schema\/))/.test(
          specifier,
        )
      )
        fail(`Web bypasses infrastructure repository: ${specifier}`);
      if (
        productionSource &&
        owner.manifest.name === "web" &&
        !/^@wodge\/core\/(?:(?:pages|rooms|discussions|workspace)\/mutations\/|features\/(?:flags|policy)$)/.test(
          specifier,
        ) &&
        /^\s*["']use client["'];/.test(source.text) &&
        /^@wodge\/(?:core(?:\/|$)|domain\/(?:persistence\/|(?:user|workspace)\/schema\/)|infra\/(?!auth\/browser$)|env$)/.test(
          specifier,
        )
      ) {
        fail(
          `Client component imports authoritative server code: ${specifier}`,
        );
      }
      if (productionSource && owner.manifest.name === "@wodge/core") {
        if (
          specifier.startsWith("drizzle-orm") &&
          !coreRepositoryFile &&
          !filename.endsWith("/types/database.ts")
        ) {
          fail("Database queries belong in core repositories, not services");
        }
        if (
          coreRepositoryFile &&
          /(?:^|\/)(?:service|account|directory|management|lifecycle|files)$/.test(
            specifier,
          )
        ) {
          fail("Repository modules must not orchestrate application services");
        }
      }
      if (
        productionSource &&
        owner.manifest.name === "@wodge/infra" &&
        /^@wodge\/domain\/.+\/schema\//.test(specifier) &&
        !filename.endsWith("/database/database.ts") &&
        !filename.endsWith("/database/types.ts")
      ) {
        fail(
          "Feature repositories belong in core; infrastructure only configures the database",
        );
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
    // Consumers import directly from the owning backend/package module.
    const checkDirectExports =
      filename.startsWith(path.join(owner.directory, "src") + path.sep) &&
      (owner.manifest.name === "backend" ||
        owner.directory.startsWith(path.join(root, "packages") + path.sep));
    const importedNames = new Set();
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      const clause = statement.importClause;
      if (clause?.name) importedNames.add(clause.name.text);
      if (clause?.namedBindings) {
        if (ts.isNamedImports(clause.namedBindings)) {
          for (const binding of clause.namedBindings.elements)
            importedNames.add(binding.name.text);
        } else {
          importedNames.add(clause.namedBindings.name.text);
        }
      }
    }
    const durableObjectExports = new Map([
      ["UserServer", "./servers/user"],
      ["WorkspaceServer", "./servers/workspace"],
      ["RoomServer", "./servers/room"],
      ["ThreadServer", "./servers/thread"],
      ["PageServer", "./servers/page"],
    ]);
    const coreServices = new Set([
      "WorkspaceAuthorization",
      "PageService",
      "AccountService",
      "WorkspaceDirectory",
      "WorkspaceManagement",
      "BillingService",
      "RoomService",
      "RoomCalls",
      "DiscussionService",
      "WorkspaceService",
      "WorkspaceLifecycle",
      "WorkspaceFiles",
      "WorkspaceAccess",
      "UserService",
      "UserAvatars",
    ]);
    const visit = (node) => {
      if (checkDirectExports && ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) {
          const requiredWorkerExport =
            filename === path.join(root, "apps/backend/src/server.ts") &&
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.exportClause &&
            ts.isNamedExports(node.exportClause) &&
            node.exportClause.elements.every(
              (binding) =>
                binding.propertyName?.text === "default" &&
                durableObjectExports.get(binding.name.text) ===
                  node.moduleSpecifier.text,
            );
          if (!requiredWorkerExport)
            fail(
              "Re-exports are forbidden; import directly from the owning module",
            );
        } else if (
          node.exportClause &&
          ts.isNamedExports(node.exportClause) &&
          node.exportClause.elements.some((binding) =>
            importedNames.has((binding.propertyName ?? binding.name).text),
          )
        ) {
          fail("Imported bindings must not be re-exported");
        }
      }
      if (
        checkDirectExports &&
        ts.isVariableStatement(node) &&
        node.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        ) &&
        node.declarationList.declarations.some(
          (declaration) =>
            declaration.initializer &&
            ts.isIdentifier(declaration.initializer) &&
            importedNames.has(declaration.initializer.text),
        )
      ) {
        fail("Imported bindings must not be re-exported through aliases");
      }
      if (
        checkDirectExports &&
        ts.isExportAssignment(node) &&
        ts.isIdentifier(node.expression) &&
        importedNames.has(node.expression.text)
      ) {
        fail("Imported bindings must not be re-exported as defaults");
      }
      if (owner.manifest.name === "backend" && filename.includes("/src/")) {
        if (
          !backendRegistrationFile &&
          ts.isNewExpression(node) &&
          ts.isIdentifier(node.expression) &&
          coreServices.has(node.expression.text)
        )
          fail("Construct backend core services only in container.ts");
      }

      if (
        ts.isImportDeclaration(node) &&
        owner.manifest.name === "web" &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        /^backend(?:\/|$)/.test(node.moduleSpecifier.text)
      ) {
        if (
          node.moduleSpecifier.text !== "backend/api" ||
          !node.importClause?.isTypeOnly
        )
          fail(
            "Web may import only the declaration-only backend/api contract with import type",
          );
      }

      if (
        ts.isImportDeclaration(node) &&
        node.moduleSpecifier.text === "tsyringe" &&
        filename.includes("/src/") &&
        !backendRegistrationFile
      ) {
        const bindings = node.importClause?.namedBindings;
        if (
          !node.importClause?.isTypeOnly &&
          (!bindings ||
            !ts.isNamedImports(bindings) ||
            bindings.elements.some(
              (binding) =>
                !binding.isTypeOnly &&
                !["inject", "injectable"].includes(
                  (binding.propertyName ?? binding.name).text,
                ),
            ))
        )
          fail(
            "Consumers use DI decorators only; container access belongs in backend registration",
          );
      }

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
