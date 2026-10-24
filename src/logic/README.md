# src/logic — mcplint

MCP server linter: contract checks + tool-poisoning security rules.

| Module | Role |
|--------|------|
| `rules.ts` | Lint rules (contract / security / quality) |
| `lint.ts` | Load path → results |
| `load.ts` | Read JSON manifests / tools arrays |
| `report.ts` | Text + JSON reporters |

## CLI

```
mcplint lint ./server.mcp.json
mcplint lint ./manifests --format json -o report.json
mcplint rules
mcplint init > mcp.json
```
