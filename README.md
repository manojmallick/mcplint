# mcplint

`mcplint` checks JSON manifests for Model Context Protocol (MCP) servers. It reports schema and contract issues, suspicious tool descriptions, dangerous tool names, secret-like defaults, and other rule-based findings.

## Build and use

```bash
pnpm install
pnpm build
node dist/cli.js init > my-server.mcp.json
node dist/cli.js lint my-server.mcp.json
```

Lint a directory and write a JSON report:

```bash
node dist/cli.js lint ./manifests --format json -o report.json
node dist/cli.js rules
```

The command exits with status 1 when any error is found. Use `--fail-on-warn` to make warnings fail too. `fixtures/good.mcp.json` and `fixtures/bad.mcp.json` are deliberately constructed examples; the bad fixture contains a clearly fake credential placeholder, never a real key.

## Rules

Rules cover required manifest fields, tool names and descriptions, JSON Schema shape, duplicate names, prompt-injection-like wording, risky command names, secret-like default values, and schemas that allow arbitrary properties.

These are static heuristics, not a full MCP security audit. Review each server's code, permissions, and behavior before using it.

The npm release workflow is manual and does not run on ordinary pushes.

## Development

```bash
pnpm typecheck
pnpm test
pnpm build
```

## License

Original project content is offered under the [PolyForm Noncommercial License 1.0.0](LICENSE). Third-party dependencies retain their own licenses. This is source-available software, not OSI-approved open source.
