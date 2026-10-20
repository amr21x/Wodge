import { readFile, writeFile } from "node:fs/promises";

// Embed SQL as data so Worker, Node fixtures and Vitest use the same migrations without SQL loaders.
for (const kind of ["user", "workspace", "room", "thread", "page"]) {
  const directory = new URL(`./objects/${kind}/`, import.meta.url);
  const journal = JSON.parse(
    await readFile(new URL("meta/_journal.json", directory), "utf8"),
  );
  const migrations = {};
  for (const entry of journal.entries) {
    migrations[`m${String(entry.idx).padStart(4, "0")}`] = await readFile(
      new URL(`${entry.tag}.sql`, directory),
      "utf8",
    );
  }
  const text = JSON.stringify({ journal, migrations }, null, 2) + "\n";
  const target = new URL("bundle.json", directory);
  if (process.argv.includes("--check")) {
    if ((await readFile(target, "utf8")) !== text)
      throw new Error(`Stale ${kind} migration bundle`);
  } else {
    await writeFile(target, text);
  }
}
