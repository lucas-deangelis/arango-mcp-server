#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Database, aql } from "arangojs";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const server = new Server(
  {
    name: "arango-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      logging: {},
      resources: {},
      tools: {},
    },
  }
);

function info(data: string) {
  server.sendLoggingMessage({
    level: "info",
    data: data,
  });
}

function debug(data: string) {
  server.sendLoggingMessage({
    level: "debug",
    data: data,
  });
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Please provide a database URL"
  );
  process.exit(1);
}

// Database URL should be in the format:
// "http://localhost:8529"
const databaseUrl = args[0];

const username = args.length > 1 ? args[1] : undefined;
const password = args.length > 2 ? args[2] : undefined;

const auth = username && password ? { username, password } : undefined;

console.error("databaseUrl: " + databaseUrl);
console.error("auth: " + JSON.stringify(auth));

const resourceBaseUrl = new URL(databaseUrl);

const db = new Database({
  url: databaseUrl,
  auth: auth,
})

async function getCollections(db: Database): Promise<CollectionType[]> {
  const cursor = await db.query(aql`
    RETURN COLLECTIONS()
  `);

  const result = await cursor.all();
  const allCollections: Array<CollectionType> = [];

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

type CollectionType = z.infer<typeof collectionSchema>;

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

interface ArangoDBURI {
  databaseName: string;
  collectionName: string;
  documentId: string;
}

class InvalidArangoDBURIError extends Error {
  constructor(message: string) {
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
export function parseArangoDBURI(uri: string): ArangoDBURI {
  // Check if the string starts with the correct prefix
  if (!uri.startsWith("arangodb:///")) {
    throw new InvalidArangoDBURIError('URI must start with "arangodb:///"');
  }

  // Remove the prefix and split the remaining path
  const path = uri.slice("arangodb:///".length);
  const components = path.split("/");

  // Validate we have exactly 3 components
  if (components.length !== 3) {
    throw new InvalidArangoDBURIError(
      "URI must have exactly three components: databaseName/collectionName/documentId"
    );
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
    auth: auth,
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
  } catch (error) {
    console.error("error: " + error);
    throw error;
  }
});

const readQuerySchema = z.object({
  databaseName: z.string(),
  aql: z.string(),
});

const readWriteQuerySchema = z.object({
  databaseName: z.string(),
  aql: z.string(),
});

const listDatabasesSchema = z.object({});

const listCollectionsSchema = z.object({
  databaseName: z.string(),
})

enum ToolName {
  READ_QUERY = "readQuery",
  READ_WRITE_QUERY = "readWriteQuery",
  LIST_DATABASES = "listDatabases",
  LIST_COLLECTIONS = "listCollections",
}

const databaseConnections = new Map<string, Database>();

function getOrCreateDatabaseConnection(databaseName: string): Database {
  if (databaseConnections.has(databaseName)) {
    return databaseConnections.get(databaseName)!;
  }

  const dbConnector = new Database({
    url: databaseUrl,
    databaseName: databaseName,
    auth: auth,
  });

  databaseConnections.set(databaseName, dbConnector);
  return dbConnector;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: ToolName.READ_QUERY,
        description: "Run a read-only AQL query",
        inputSchema: zodToJsonSchema(readQuerySchema),
      },
      {
        name: ToolName.READ_WRITE_QUERY,
        description: "Run an AQL query",
        inputSchema: zodToJsonSchema(readWriteQuerySchema),
      },
      {
        name: ToolName.LIST_DATABASES,
        description: "List all the databases",
        inputSchema: zodToJsonSchema(listDatabasesSchema),
      },
      {
        name: ToolName.LIST_COLLECTIONS,
        description: "List all the collections in a database",
        inputSchema: zodToJsonSchema(listCollectionsSchema),
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  server.sendLoggingMessage({
    level: "debug",
    data: `CallToolRequest with name ${request.params.name}`,
  })

  try {
    if (request.params.name === ToolName.READ_QUERY) {
      const dbConnector = getOrCreateDatabaseConnection(request.params.arguments?.databaseName as string);

      const aql = request.params.arguments?.aql as string;

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
    } else if (request.params.name === ToolName.READ_WRITE_QUERY) {
      const dbConnector = getOrCreateDatabaseConnection(request.params.arguments?.databaseName as string);

      const aql = request.params.arguments?.aql as string;

      const allCollections = await getCollections(dbConnector);

      const tx = await dbConnector.beginTransaction({
        read: allCollections.map((collection) => collection.name),
        write: allCollections.map((collection) => collection.name),
      });

      const cursor = await tx.step(() => dbConnector.query(aql));

      const result = await cursor.all();

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: false,
      };
    } else if (request.params.name === ToolName.LIST_DATABASES) {
      server.sendLoggingMessage({
        level: "debug",
        data: `listDatabases`,
      })

      const allDatabases = await db.databases();

      return {
        content: [{
          type: "text", text: JSON.stringify(allDatabases.map(database => {
            return {
              name: database.name,
            }
          }), null, 2)
        }],
        isError: false,
      };
    } else if (request.params.name === ToolName.LIST_COLLECTIONS) {
      const dbConnector = getOrCreateDatabaseConnection(request.params.arguments?.databaseName as string);
      const allCollections = await getCollections(dbConnector);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(allCollections.map(collection => ({
            name: collection.name
          })), null, 2)
        }],
        isError: false,
      };
    }
  } catch (error) {
    server.sendLoggingMessage({
      level: "error",
      data: `Error: ${error}`,
    })

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
