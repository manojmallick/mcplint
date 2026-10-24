#!/usr/bin/env node
import { Command } from "commander";
import { writeFile } from "node:fs/promises";
import { lintPath, listRules, printTextReport, toJsonReport } from "./logic/index.js";

const program = new Command();

program
  .name("mcplint")
  .description(
    "Lint, security-audit, and contract-test MCP server manifests (ESLint + Pact for MCP)",
  )
  .version("0.1.0");

program
  .command("lint")
  .description("Lint an MCP server manifest JSON file or directory of JSON files")
  .argument("<path>", "path to manifest.json or directory")
  .option("-f, --format <fmt>", "text | json", "text")
  .option("-o, --output <file>", "write report to file (json recommended)")
  .option("--fail-on-warn", "exit 1 on warnings too", false)
  .action(async (path: string, opts: { format: string; output?: string; failOnWarn: boolean }) => {
    try {
      const results = await lintPath(path);
      const json = toJsonReport(results);

      if (opts.format === "json") {
        console.log(json);
      } else {
        printTextReport(results);
      }

      if (opts.output) {
        await writeFile(opts.output, json, "utf8");
        if (opts.format !== "json") {
          console.log(`\nWrote ${opts.output}`);
        }
      }

      const failed = results.some((r) => !r.ok);
      const warned = results.some((r) => r.warnCount > 0);
      if (failed || (opts.failOnWarn && warned)) {
        process.exitCode = 1;
      }
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
    }
  });

program
  .command("rules")
  .description("List built-in rules")
  .action(() => {
    const rules = listRules();
    for (const r of rules) {
      console.log(
        `${r.id.padEnd(32)} ${r.severity.padEnd(5)} ${r.category.padEnd(9)} ${r.description}`,
      );
    }
    console.log(`\n${rules.length} rules`);
  });

program
  .command("init")
  .description("Print a sample MCP tools manifest to stdout")
  .action(() => {
    const sample = {
      name: "example-mcp",
      version: "0.1.0",
      description: "Example MCP server manifest for mcplint",
      tools: [
        {
          name: "search_docs",
          description: "Search project documentation by keyword and return matching sections.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
            },
            required: ["query"],
            additionalProperties: false,
          },
        },
      ],
    };
    console.log(JSON.stringify(sample, null, 2));
  });

program.parse();
