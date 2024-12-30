# ArangoDB MCP Server

This is an implementation of the Model Context Protocol for ArangoDB.

## Overview

To be filled.

## Components

### Resources

### Tools

#### Query Tools

- `query`
  - Execute read-only query on the database
  - Input:
    - `query` (string): The AQL query to execute
  - Returns: Query results as array of objects
- `listDatabases`
  - List all the databases on the ArangoDB server
  - Returns: Array of the databases names

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
- [x] `resources/read` with a template to read any document by database name, collection, id.
- [ ] properly document tools in the readme
- [ ] read/write query
- [ ] fix the todo
- [ ] Properly study the spec to see if the current implementation of resources actually make sense (I don't think it does)
  - [x] The resource templates make sense
- [ ] Change all the "arango" to "arangodb" (repo name included...)
- [ ] client pool (one client by database)
  - [ ] Or maybe not? Since other servers seem to be one by database and not one by database server
- [ ] Add back the arangodb password
- [ ] Like on the SQLite MCP client
  - [ ] `write_query` tool separated from `read_query`
  - [ ] `list_collections` (see `list_tables`)
- [ ] Proper README
  - [ ] Tools/resource/etc following the format of the official anthropic stuff
- [ ] Figure out notifications
- [ ] Health checks
- [ ] Add username and passwords as parameters of the command
- [ ] More tools?
- [ ] Access all the databases running on an arangodb instance
- [ ] Release on npm somehow so it can be used with `npx`
- [ ] `resources/subscribe` and `notifications/resources/list_changed` and `resources/unsubscribe`