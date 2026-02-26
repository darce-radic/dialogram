# MCP Server

Dialogram ships a stdio MCP server so external agents can call your app tools directly.

## Run

```bash
npm run start:mcp
```

Required env vars:

- `DIALOGRAM_AGENT_KEY` (required)
- `DIALOGRAM_APP_URL` (required)

## Exposed MCP Tools

- `list_documents`
- `list_threads`
- `get_document`
- `update_document`
- `create_thread`
- `reply_thread`
- `push_scratchpad`

## Example MCP Client Config (JSON)

```json
{
  "mcpServers": {
    "dialogram": {
      "command": "npm",
      "args": ["run", "start:mcp"],
      "env": {
        "DIALOGRAM_APP_URL": "https://your-dialogram-host",
        "DIALOGRAM_AGENT_KEY": "dlg_..."
      }
    }
  }
}
```

## API Docs

- OpenAPI JSON: `/api/openapi.json`
- Interactive docs: `/api-docs`

## Reliability Notes

- Tool calls can return API `429` when rate limits are exceeded.
- MCP clients should retry with backoff and respect `Retry-After`.

