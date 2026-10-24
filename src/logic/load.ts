import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import type { McpServerManifest } from "./types.js";

export async function loadManifestFile(path: string): Promise<McpServerManifest> {
  const raw = await readFile(path, "utf8");
  const data = JSON.parse(raw) as unknown;

  // Allow a bare tools array
  if (Array.isArray(data)) {
    return { name: path, tools: data as McpServerManifest["tools"] };
  }

  if (data && typeof data === "object") {
    const obj = data as McpServerManifest;
    // Some exports nest under mcpServers or server
    if (!obj.tools && Array.isArray((obj as { server?: { tools?: unknown } }).server?.tools)) {
      return {
        ...obj,
        tools: (obj as { server: { tools: McpServerManifest["tools"] } }).server
          .tools,
      };
    }
    return obj;
  }

  throw new Error(`Unsupported manifest shape in ${path}`);
}

export async function collectTargets(path: string): Promise<string[]> {
  const st = await stat(path);
  if (st.isFile()) return [path];

  const entries = await readdir(path);
  const files: string[] = [];
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    const full = join(path, name);
    const s = await stat(full);
    if (s.isFile()) files.push(full);
  }
  // Prefer common names first
  files.sort((a, b) => {
    const score = (p: string) => {
      const n = p.toLowerCase();
      if (n.endsWith("mcp.json")) return 0;
      if (n.endsWith("tools.json")) return 1;
      if (n.includes("manifest")) return 2;
      return 3;
    };
    return score(a) - score(b) || a.localeCompare(b);
  });
  return files;
}

export function isJsonPath(p: string): boolean {
  return extname(p).toLowerCase() === ".json" || p.endsWith(".json");
}
