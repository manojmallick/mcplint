import type { LintIssue, McpServerManifest, McpToolDef, RuleMeta } from "./types.js";

export const RULES: RuleMeta[] = [
  {
    id: "server-name-required",
    severity: "error",
    category: "contract",
    description: "Manifest must include a non-empty name",
  },
  {
    id: "tools-required",
    severity: "error",
    category: "contract",
    description: "Manifest must declare a tools array",
  },
  {
    id: "tools-nonempty",
    severity: "warn",
    category: "quality",
    description: "Tools array should not be empty",
  },
  {
    id: "tool-name-required",
    severity: "error",
    category: "contract",
    description: "Each tool needs a name",
  },
  {
    id: "tool-name-format",
    severity: "warn",
    category: "quality",
    description: "Tool names should be snake_case or kebab-case identifiers",
  },
  {
    id: "tool-description-required",
    severity: "error",
    category: "contract",
    description: "Each tool needs a description (agents rely on it)",
  },
  {
    id: "tool-description-min",
    severity: "warn",
    category: "quality",
    description: "Descriptions should be at least 12 characters",
  },
  {
    id: "input-schema-object",
    severity: "error",
    category: "contract",
    description: "inputSchema must be type object (JSON Schema)",
  },
  {
    id: "input-schema-required-props",
    severity: "error",
    category: "contract",
    description: "required[] entries must exist in properties",
  },
  {
    id: "dangerous-tool-name",
    severity: "warn",
    category: "security",
    description: "Tool name suggests shell/exec/delete — ensure auth + confirmations",
  },
  {
    id: "prompt-injection-description",
    severity: "error",
    category: "security",
    description: "Description contains tool-poisoning / prompt-injection phrases",
  },
  {
    id: "secret-like-default",
    severity: "error",
    category: "security",
    description: "Default values look like secrets/tokens",
  },
  {
    id: "unbounded-schema",
    severity: "warn",
    category: "security",
    description: "Schema allows arbitrary keys with no property constraints",
  },
  {
    id: "duplicate-tool-name",
    severity: "error",
    category: "contract",
    description: "Tool names must be unique",
  },
];

const DANGEROUS_NAME =
  /\b(exec|shell|bash|cmd|eval|spawn|rm|delete_all|drop_db|run_command|system)\b/i;

const INJECTION =
  /ignore (all )?(previous|prior|above)|disregard (your|the) (instructions|system)|you are now|system prompt|developer message|do not follow safety|jailbreak/i;

const SECRET_DEFAULT =
  /^(sk-|rk-|ghp_|gho_|xox[baprs]-|AKIA[0-9A-Z]{16}|-----BEGIN )/i;

const NAME_FORMAT = /^[a-z][a-z0-9_-]{1,63}$/;

export function lintManifest(
  manifest: McpServerManifest,
  filePath = "manifest",
): LintIssue[] {
  const issues: LintIssue[] = [];

  if (!manifest || typeof manifest !== "object") {
    issues.push({
      ruleId: "tools-required",
      severity: "error",
      message: "Manifest root must be a JSON object",
      path: filePath,
    });
    return issues;
  }

  if (!manifest.name || String(manifest.name).trim() === "") {
    issues.push({
      ruleId: "server-name-required",
      severity: "error",
      message: "Missing server name",
      path: "$.name",
    });
  }

  if (!Array.isArray(manifest.tools)) {
    issues.push({
      ruleId: "tools-required",
      severity: "error",
      message: "Missing tools array — expected { name, tools: [...] }",
      path: "$.tools",
    });
    return issues;
  }

  if (manifest.tools.length === 0) {
    issues.push({
      ruleId: "tools-nonempty",
      severity: "warn",
      message: "tools array is empty",
      path: "$.tools",
    });
  }

  const seen = new Map<string, number>();
  manifest.tools.forEach((tool, index) => {
    issues.push(...lintTool(tool, index, seen));
  });

  return issues;
}

function lintTool(
  tool: McpToolDef,
  index: number,
  seen: Map<string, number>,
): LintIssue[] {
  const issues: LintIssue[] = [];
  const base = `$.tools[${index}]`;
  const name = tool?.name ? String(tool.name) : undefined;

  if (!name) {
    issues.push({
      ruleId: "tool-name-required",
      severity: "error",
      message: "Tool is missing name",
      path: `${base}.name`,
    });
  } else {
    if (seen.has(name)) {
      issues.push({
        ruleId: "duplicate-tool-name",
        severity: "error",
        message: `Duplicate tool name "${name}" (also at index ${seen.get(name)})`,
        path: `${base}.name`,
        toolName: name,
      });
    } else {
      seen.set(name, index);
    }

    if (!NAME_FORMAT.test(name)) {
      issues.push({
        ruleId: "tool-name-format",
        severity: "warn",
        message: `Tool name "${name}" should match /^[a-z][a-z0-9_-]{1,63}$/`,
        path: `${base}.name`,
        toolName: name,
      });
    }

    if (DANGEROUS_NAME.test(name)) {
      issues.push({
        ruleId: "dangerous-tool-name",
        severity: "warn",
        message: `Tool name "${name}" looks high-risk (exec/shell/delete). Confirm authz + human confirmation.`,
        path: `${base}.name`,
        toolName: name,
      });
    }
  }

  const desc = tool?.description != null ? String(tool.description) : "";
  if (!desc.trim()) {
    issues.push({
      ruleId: "tool-description-required",
      severity: "error",
      message: "Tool is missing description",
      path: `${base}.description`,
      toolName: name,
    });
  } else {
    if (desc.trim().length < 12) {
      issues.push({
        ruleId: "tool-description-min",
        severity: "warn",
        message: "Description is very short — agents need clear tool semantics",
        path: `${base}.description`,
        toolName: name,
      });
    }
    if (INJECTION.test(desc)) {
      issues.push({
        ruleId: "prompt-injection-description",
        severity: "error",
        message:
          "Description matches tool-poisoning / prompt-injection patterns",
        path: `${base}.description`,
        toolName: name,
      });
    }
  }

  const schema = tool?.inputSchema;
  if (schema == null || typeof schema !== "object") {
    issues.push({
      ruleId: "input-schema-object",
      severity: "error",
      message: "Missing inputSchema object",
      path: `${base}.inputSchema`,
      toolName: name,
    });
    return issues;
  }

  const type = (schema as { type?: string }).type;
  if (type && type !== "object") {
    issues.push({
      ruleId: "input-schema-object",
      severity: "error",
      message: `inputSchema.type must be "object" (got "${type}")`,
      path: `${base}.inputSchema.type`,
      toolName: name,
    });
  }

  const properties = (schema as { properties?: Record<string, unknown> })
    .properties;
  const required = (schema as { required?: unknown }).required;
  const additional = (schema as { additionalProperties?: unknown })
    .additionalProperties;

  if (Array.isArray(required) && properties && typeof properties === "object") {
    for (const key of required) {
      if (typeof key === "string" && !(key in properties)) {
        issues.push({
          ruleId: "input-schema-required-props",
          severity: "error",
          message: `required contains "${key}" but properties has no such key`,
          path: `${base}.inputSchema.required`,
          toolName: name,
        });
      }
    }
  }

  if (
    additional === true &&
    (!properties || Object.keys(properties).length === 0)
  ) {
    issues.push({
      ruleId: "unbounded-schema",
      severity: "warn",
      message:
        "inputSchema allows arbitrary properties with no defined fields — easy footgun for agents",
      path: `${base}.inputSchema`,
      toolName: name,
    });
  }

  if (properties && typeof properties === "object") {
    for (const [prop, def] of Object.entries(properties)) {
      if (!def || typeof def !== "object") continue;
      const d = def as { default?: unknown };
      if (d.default != null && typeof d.default === "string") {
        if (SECRET_DEFAULT.test(d.default) || d.default.length > 40) {
          // long defaults that look like tokens
          if (SECRET_DEFAULT.test(d.default) || /api[_-]?key|token|secret/i.test(prop)) {
            issues.push({
              ruleId: "secret-like-default",
              severity: "error",
              message: `Property "${prop}" has a secret-like default value`,
              path: `${base}.inputSchema.properties.${prop}.default`,
              toolName: name,
            });
          }
        }
      }
    }
  }

  return issues;
}

export function listRules(): RuleMeta[] {
  return RULES;
}
