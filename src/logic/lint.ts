import { collectTargets, loadManifestFile } from "./load.js";
import { buildResult } from "./report.js";
import { lintManifest } from "./rules.js";
import type { LintResult } from "./types.js";

export async function lintPath(path: string): Promise<LintResult[]> {
  const files = await collectTargets(path);
  if (files.length === 0) {
    throw new Error(`No JSON manifests found at ${path}`);
  }

  const results: LintResult[] = [];
  for (const file of files) {
    try {
      const manifest = await loadManifestFile(file);
      const issues = lintManifest(manifest, file);
      results.push(
        buildResult(file, issues, {
          toolCount: Array.isArray(manifest.tools) ? manifest.tools.length : 0,
          serverName: manifest.name ? String(manifest.name) : undefined,
        }),
      );
    } catch (e) {
      results.push(
        buildResult(
          file,
          [
            {
              ruleId: "parse-error",
              severity: "error",
              message: e instanceof Error ? e.message : "Failed to parse",
              path: file,
            },
          ],
          { toolCount: 0 },
        ),
      );
    }
  }
  return results;
}
