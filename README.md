# Arango MCP Server

This is an implementation of the Model Context Protocol for Arango.

## Usage

To connect to an arangodb instance running on localhost:2434, to the database "account", add the following to your `claude_desktop_config.json`, assuming the path to this project is `/home/yourcoolname/arango-mcp-server`:

```json
{
	"mcpServers": {
		"arangodb-account" : {
			"command": "node",
			"args": [
				"/home/yourcoolname/arango-mcp-server/dist/index.js",
				"https://localhost:2434",
				"account"
			]
		}
	}
}
```

## Tools

- query: Run a read-only AQL query.

## Todo

- [ ] Add username and passwords as parameters of the command
- [ ] More tools?
- [ ] Access all the databases running on an arangodb instance
- [ ] Release on npm somehow so it can be used with `npx`
- [ ] Properly study the spec to see if the current implementation of resources actually make sense (I don't think it does)
