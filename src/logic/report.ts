import type { LintIssue, LintResult } from "./types.js";

export function buildResult(
  file: string,
  issues: LintIssue[],
  summary: LintResult["summary"],
): LintResult {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warn").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;
  return {
    file,
    ok: errorCount === 0,
    errorCount,
    warnCount,
    infoCount,
    issues,
    summary,
  };
}

export function printTextReport(results: LintResult[]): void {
  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    console.log(
      `\n${icon} ${r.file}  (${r.summary.toolCount} tools` +
        (r.summary.serverName ? `, ${r.summary.serverName}` : "") +
        `)  errors=${r.errorCount} warns=${r.warnCount}`,
    );
    if (r.issues.length === 0) {
      console.log("  No issues.");
      continue;
    }
    for (const issue of r.issues) {
      const tag = issue.severity.toUpperCase().padEnd(5);
      const tool = issue.toolName ? ` [${issue.toolName}]` : "";
      console.log(`  ${tag} ${issue.ruleId}${tool}`);
      console.log(`        ${issue.message}`);
      console.log(`        at ${issue.path}`);
    }
  }

  const totals = results.reduce(
    (a, r) => ({
      e: a.e + r.errorCount,
      w: a.w + r.warnCount,
      files: a.files + 1,
      failed: a.failed + (r.ok ? 0 : 1),
    }),
    { e: 0, w: 0, files: 0, failed: 0 },
  );
  console.log(
    `\n${totals.files} file(s) · ${totals.failed} failed · ${totals.e} error(s) · ${totals.w} warning(s)`,
  );
}

export function toJsonReport(results: LintResult[]): string {
  return JSON.stringify(
    {
      version: 1,
      tool: "mcplint",
      ok: results.every((r) => r.ok),
      results,
    },
    null,
    2,
  );
}
