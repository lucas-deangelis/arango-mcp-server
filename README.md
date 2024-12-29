# ArangoDB MCP Server

This is an implementation of the Model Context Protocol for ArangoDB.

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

## Development

Clone the repository.
Install everything.
Setup the dev environment.
Run the watcher.
Edit index.ts.

```sh
$ npm install
$ npm run dev:setup
$ npm run dev
```

Go to http://localhost:5173/ to see the inspector.

## Todo

- [x] Dev environment
- [ ] Change all the "arango" to "arangodb" (repo name included...)
- [ ] `resources/read` with a template to read any document by database name, collection, id.
- [ ] client pool (one client by database)
- [ ] Proper README
- [ ] Figure out notifications
- [ ] Health checks
- [ ] Add username and passwords as parameters of the command
- [ ] More tools?
- [ ] Access all the databases running on an arangodb instance
- [ ] Release on npm somehow so it can be used with `npx`
- [ ] Properly study the spec to see if the current implementation of resources actually make sense (I don't think it does)
- [ ] `resources/subscribe` and `notifications/resources/list_changed` and `resources/unsubscribe`