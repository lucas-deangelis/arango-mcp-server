#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { Database, aql } from "arangojs";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
const server = new Server({
    name: "arango-mcp-server",
    version: "0.1.0",
}, {
    capabilities: {
        logging: {},
        resources: {},
        tools: {},
    },
});
function info(data) {
    server.sendLoggingMessage({
        level: "info",
        data: data,
    });
}
function debug(data) {
    server.sendLoggingMessage({
        level: "debug",
        data: data,
    });
}
// const error = (data: string) => {
//   server.sendLoggingMessage({
//     level: "error",
//     data: data,
//   })
// }
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("Please provide a database URL and a database name as a command-line argument");
    process.exit(1);
}
// Database URL should be in the format:
// "http://localhost:8529"
const databaseUrl = args[0];
// Database name should be the name of the database to connect to, eg "account".
const databaseName = args[1];
const resourceBaseUrl = new URL(databaseUrl);
// info(`Starting ArangoDB MCP server with URL ${databaseUrl}`);
// server.sendLoggingMessage({
//   level: "info",
//   data: `Starting ArangoDB MCP server with URL ${databaseUrl}`,
// })
const db = new Database({
    url: databaseUrl,
    // auth: { username: "root", password: "root" },
});
// const db = new Database({
//   url: databaseUrl,
//   databaseName: databaseName,
//   auth: { username: "root", password: "root" },
// });
const SCHEMA_PATH = "schema";
// async function getCollections(db: Database): Promise<string[]> {
//   const cursor = await db.query(aql`
//     RETURN COLLECTIONS()
//   `);
//   const collectionSchema = z.object({
//     _id: z.string(),
//     name: z.string(),
//   });
//   type CollectionType = z.infer<typeof collectionSchema>;
//   const result = await cursor.all();
//   return cursor.all().then((result) => {
//     return result.flat().map((collection) => collectionSchema.parse(collection).name);
//   });
// }
async function getCollections(db) {
    const cursor = await db.query(aql `
    RETURN COLLECTIONS()
  `);
    const result = await cursor.all();
    const allCollections = [];
    for (const collectionArray of result) {
        for (const collection of collectionArray) {
            allCollections.push(collectionSchema.parse(collection));
        }
    }
    return allCollections;
}
const collectionSchema = z
    .object({
    _id: z.string(),
    name: z.string(),
})
    .strict();
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    server.sendLoggingMessage({
        level: "debug",
        data: `ListResourcesRequestSchema with url ${databaseUrl}`,
    });
    const allCollections = await getCollections(db);
    console.error("collections: " + allCollections);
    console.error("collections:" + JSON.stringify(allCollections));
    return {
        resources: allCollections.map((collection) => ({
            uri: new URL(`${resourceBaseUrl}/_api/document/${collection.name}`),
            mimeType: "application/json",
            name: `"${collection.name}" http endpoint`,
        })),
    };
});
server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
        resourceTemplates: [
            {
                uriTemplate: "arangodb:///{database}/{collection}/{documentID}",
                name: "ArangoDB document",
                mimeType: "application/json",
                description: "A document in an ArangoDB collection",
            },
        ],
    };
});
class InvalidArangoDBURIError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidArangoDBURIError";
    }
}
/**
 * Parses and validates an ArangoDB URI string of the format:
 * arangodb:///databaseName/collectionName/documentID
 *
 * @param uri The ArangoDB URI string to parse
 * @returns An object containing the parsed components
 * @throws InvalidArangoDBURIError if the URI format is invalid
 */
export function parseArangoDBURI(uri) {
    // Check if the string starts with the correct prefix
    if (!uri.startsWith("arangodb:///")) {
        throw new InvalidArangoDBURIError('URI must start with "arangodb:///"');
    }
    // Remove the prefix and split the remaining path
    const path = uri.slice("arangodb:///".length);
    const components = path.split("/");
    // Validate we have exactly 3 components
    if (components.length !== 3) {
        throw new InvalidArangoDBURIError("URI must have exactly three components: databaseName/collectionName/documentId");
    }
    // Validate each component is non-empty
    const [databaseName, collectionName, documentId] = components;
    if (!databaseName) {
        throw new InvalidArangoDBURIError("Database name cannot be empty");
    }
    if (!collectionName) {
        throw new InvalidArangoDBURIError("Collection name cannot be empty");
    }
    if (!documentId) {
        throw new InvalidArangoDBURIError("Document ID cannot be empty");
    }
    // Optional: Add additional validation for component formats if needed
    // For example, checking for valid characters, length limits, etc.
    return {
        databaseName,
        collectionName,
        documentId,
    };
}
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const arangodbURI = parseArangoDBURI(uri);
    const db = new Database({
        url: databaseUrl,
        databaseName: arangodbURI.databaseName,
        // auth: { username: "root", password: "root" },
    });
    try {
        const document = await db
            .collection(arangodbURI.collectionName)
            .document(arangodbURI.documentId);
        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(document),
                },
            ],
        };
    }
    catch (error) {
        console.error("error: " + error);
        throw error;
    }
});
// server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
//   const resourceUrl = new URL(request.params.uri);
//   const pathComponents = resourceUrl.pathname.split("/");
//   const schema = pathComponents.pop();
//   const tableName = pathComponents.pop();
//   if (schema !== SCHEMA_PATH) {
//     throw new Error("Invalid resource URI");
//   }
//   const client = await pool.connect();
//   try {
//     const result = await client.query(
//       "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
//       [tableName],
//     );
//     return {
//       contents: [
//         {
//           uri: request.params.uri,
//           mimeType: "application/json",
//           text: JSON.stringify(result.rows, null, 2),
//         },
//       ],
//     };
//   } finally {
//     client.release();
//   }
// });
const querySchema = z.object({
    databaseName: z.string(),
    aql: z.string(),
});
const listDatabasesSchema = z.object({});
var ToolName;
(function (ToolName) {
    ToolName["QUERY"] = "query";
    ToolName["LIST_DATABASES"] = "listDatabases";
})(ToolName || (ToolName = {}));
const databaseConnections = new Map();
function getOrCreateDatabaseConnection(databaseName) {
    if (databaseConnections.has(databaseName)) {
        return databaseConnections.get(databaseName);
    }
    const dbConnector = new Database({
        url: databaseUrl,
        databaseName: databaseName,
        auth: { username: "root", password: "root" },
    });
    databaseConnections.set(databaseName, dbConnector);
    return dbConnector;
}
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: ToolName.QUERY,
                description: "Run a read-only AQL query",
                inputSchema: zodToJsonSchema(querySchema),
            },
            {
                name: ToolName.LIST_DATABASES,
                description: "List all the databases",
                inputSchema: zodToJsonSchema(listDatabasesSchema),
            }
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    server.sendLoggingMessage({
        level: "debug",
        data: `CallToolRequest with name ${request.params.name}`,
    });
    try {
        if (request.params.name === ToolName.QUERY) {
            const dbConnector = getOrCreateDatabaseConnection(request.params.arguments?.databaseName);
            const aql = request.params.arguments?.aql;
            const allCollections = await getCollections(dbConnector);
            const tx = await dbConnector.beginTransaction({
                read: allCollections.map((collection) => collection.name),
            });
            const cursor = await tx.step(() => dbConnector.query(aql));
            const result = await cursor.all();
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                isError: false,
            };
        }
        else if (request.params.name === ToolName.LIST_DATABASES) {
            server.sendLoggingMessage({
                level: "debug",
                data: `listDatabases`,
            });
            const allDatabases = await db.databases();
            return {
                content: [{ type: "text", text: JSON.stringify(allDatabases.map(database => {
                            return {
                                name: database.name,
                            };
                        }), null, 2) }],
                isError: false,
            };
        }
    }
    catch (error) {
        server.sendLoggingMessage({
            level: "error",
            data: `Error: ${error}`,
        });
        console.error("error inside the CallToolRequestSchema: " + error);
        throw error;
    }
    throw new Error("Unknown tool");
});
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
runServer().catch(console.error);
