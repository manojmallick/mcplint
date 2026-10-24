/** mcplint — MCP server lint / security / contract types */

export type Severity = "error" | "warn" | "info";

export interface LintIssue {
  ruleId: string;
  severity: Severity;
  message: string;
  path: string;
  toolName?: string;
}

export interface LintResult {
  file: string;
  ok: boolean;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  issues: LintIssue[];
  summary: {
    toolCount: number;
    serverName?: string;
  };
}

export interface McpToolDef {
  name?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface McpServerManifest {
  name?: string;
  version?: string;
  description?: string;
  tools?: McpToolDef[];
  /** Some packs use mcpServers style — we still accept tools at top level */
  [key: string]: unknown;
}

export interface RuleMeta {
  id: string;
  severity: Severity;
  description: string;
  category: "contract" | "security" | "quality";
}
