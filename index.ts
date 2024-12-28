#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Database, aql } from "arangojs";
import { z } from "zod";

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
  databaseName: databaseName,
  auth: { username: "root", password: "root" },
});

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

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query",
        description: "Run a read-only AQL query",
        inputSchema: {
          type: "object",
          properties: {
            aql: { type: "string" },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "query") {
    const aql = request.params.arguments?.aql as string;

    const allCollections = await getCollections(db);

    const tx = await db.beginTransaction({
      read: allCollections.map((collection) => collection.name),
    })

    const cursor = await tx.step(() => db.query(aql));

    const result = await cursor.all()

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: false,
    };
  }

  throw new Error("Unknown tool");
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);
