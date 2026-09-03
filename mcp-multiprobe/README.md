# mcp-multiprobe

MCP (Model Context Protocol) server that gives an MCP client (Claude Code, Claude
Desktop, etc.) **read-only** access to the Multiprobe MS SQL Server database.

This is a standalone service — it is not part of the ЧекБэк backend/frontend and
has no dependency on them. It talks to Multiprobe directly over `stdio`.

## Tools

| Tool | Description |
|------|-------------|
| `list_schemas` | List all schemas in the database. |
| `list_tables` | List tables/views, optionally filtered by schema. |
| `describe_table` | Column names, types, nullability for a table. |
| `query` | Run a single read-only `SELECT`/`WITH` statement. Results capped at 500 rows. |

There is no write/insert/update/delete tool by design — this server is read-only.

## Safety model

Two layers:

1. **DB-level (primary):** connect with a SQL Server login that only has
   `SELECT` permission on the relevant schema(s). This is the real security
   boundary — set it up before pointing this server at a production instance.
2. **Query guard (defense-in-depth):** `src/readonlyGuard.js` rejects anything
   that isn't a single `SELECT`/`WITH` statement, blocks stacked statements
   (`;`), and blocks mutation/DDL/`EXEC`/`sp_`/`xp_` keywords. It is not a full
   SQL parser and should not be relied on as the sole safety mechanism.

## Setup

```bash
cd mcp-multiprobe
npm install
cp .env.example .env
# edit .env with real Multiprobe connection details
npm start
```

## Registering with an MCP client

Example `.mcp.json` entry (Claude Code):

```json
{
  "mcpServers": {
    "multiprobe": {
      "command": "node",
      "args": ["mcp-multiprobe/src/index.js"],
      "env": {
        "MULTIPROBE_DB_SERVER": "multiprobe-db.example.com",
        "MULTIPROBE_DB_DATABASE": "Multiprobe",
        "MULTIPROBE_DB_USER": "multiprobe_readonly",
        "MULTIPROBE_DB_PASSWORD": "changeme"
      }
    }
  }
}
```

Or point `command`/`args` at an absolute path if registering from outside this
repo.

## Tests

```bash
npm test
```

Currently covers the read-only query guard (`src/readonlyGuard.test.js`). The
DB access layer is not unit tested here since it requires a live MS SQL
Server instance — see `backend/` in this repo for the pattern used elsewhere
(inject a fake `db` object) if that coverage is added later.
