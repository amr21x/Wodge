import { readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type DefaultTheme } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const repositoryRoot = resolve(projectRoot, "../..");
const sourceRoot = resolve(repositoryRoot, "docs");
const repository = "https://github.com/amr21x/Wodge";

function pageRoute(path: string) {
  return "/" + path.replace(/(^|\/)README\.md$/, "$1").replace(/\.md$/, "");
}

function pageTitle(path: string) {
  const markdown = readFileSync(resolve(sourceRoot, path), "utf8");
  return markdown.match(/^# (.+)$/m)?.[1] ?? path;
}

function sidebar(directory: string): DefaultTheme.SidebarItem[] {
  return readdirSync(resolve(sourceRoot, directory), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((entry) => entry.name !== "README.md")
    .flatMap((entry): DefaultTheme.SidebarItem[] => {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        const index = `${path}/README.md`;
        const hasIndex = readdirSync(resolve(sourceRoot, path)).includes(
          "README.md",
        );
        return [
          {
            text: hasIndex ? pageTitle(index) : entry.name.replaceAll("-", " "),
            ...(hasIndex ? { link: pageRoute(index) } : {}),
            collapsed: true,
            items: sidebar(path),
          },
        ];
      }
      return entry.name.endsWith(".md")
        ? [{ text: pageTitle(path), link: pageRoute(path) }]
        : [];
    });
}

export default withMermaid(
  defineConfig({
    title: "Wodge Docs",
    description:
      "Product, architecture and operations documentation for Wodge.",
    base: "/docs/",
    srcDir: sourceRoot,
    // Match the public path on disk so Cloudflare can serve assets without Worker code.
    outDir: resolve(projectRoot, "dist/docs"),
    cleanUrls: true,
    // Markdown lives outside this package. Resolve its SSR runtime from this app.
    vite: {
      resolve: {
        alias: {
          vue: dirname(fileURLToPath(import.meta.resolve("vue/package.json"))),
        },
      },
    },
    mermaid: { securityLevel: "strict" },
    rewrites: (path) => path.replace(/(^|\/)README\.md$/, "$1index.md"),
    sitemap: { hostname: "https://wodge.amr21.dev/docs/" },
    markdown: {
      config(md) {
        // Keep repository Markdown unchanged: README indexes become site directories,
        // while references outside docs (source, migrations, evidence JSON) open GitHub.
        md.core.ruler.after("inline", "repository-links", (state) => {
          const source = state.env.realPath ?? state.env.path;
          if (!source) return;
          for (const block of state.tokens) {
            for (const token of block.children ?? []) {
              if (token.type !== "link_open") continue;
              const href = token.attrGet("href");
              if (!href || /^(?:#|\/\/|[a-z][\w+.-]*:)/i.test(href)) continue;
              const url = new URL(
                href,
                "https://repository.local/" + relative(repositoryRoot, source),
              );
              const path = decodeURIComponent(url.pathname.slice(1));
              const suffix = url.search + url.hash;
              token.attrSet(
                "href",
                path.startsWith("docs/") && path.endsWith(".md")
                  ? pageRoute(path.slice("docs/".length)) + suffix
                  : `${repository}/blob/main/${path}${suffix}`,
              );
            }
          }
        });
      },
    },
    themeConfig: {
      siteTitle: "Wodge / Docs",
      nav: [
        { text: "Product", link: "/product/" },
        { text: "Develop", link: "/development/" },
        { text: "Operate", link: "/operations/" },
        {
          text: "Open Wodge",
          link: "https://wodge.amr21.dev",
          target: "_self",
        },
      ],
      sidebar: [
        { text: "Documentation home", link: "/" },
        ...[
          ["product", "Product"],
          ["architecture", "Architecture"],
          ["development", "Development"],
          ["operations", "Operations"],
          ["features", "Features"],
          ["design", "Design"],
          ["decisions", "Decisions"],
        ].map(([directory, text]): DefaultTheme.SidebarItem => ({
          text,
          ...(directory !== "features" ? { link: `/${directory}/` } : {}),
          collapsed: true,
          items: sidebar(directory),
        })),
      ],
      search: { provider: "local" },
      outline: [2, 3],
      editLink: { pattern: `${repository}/edit/main/docs/:path` },
      socialLinks: [{ icon: "github", link: repository }],
      footer: {
        message: "Wodge graduation capstone and portfolio revival · AGPL-3.0",
      },
    },
  }),
);
