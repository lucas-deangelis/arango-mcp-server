I'm trying to understand what the postgres mcp server does.
First, the `ListResourcesRequestSchema`.
The comment says "Sent from the client to request a list of resources the server has".
For postgres, for each table it returns a resource URI that contains the JSON schema information for each table, column names, data types.
For arango, this won't really work for collections as they're "untyped", unless the collection has a schema set.
Still, we can return all collections.

I had some troubles with zod and extracting the array from the promises and the cursor stuff with arangojs, but it seems fixed now.
Now to run it properly, I'll try the mcp inspector.

MCP inspector works well, but now I think the connection to arangodb doesn't work as expected.
I'm trying to add logging but I think this is causing issues too, I got an error "server does not implement logging", and "throw new Error("Not connected"); ^ Error: Not connected at Server.notification".

Seems like the "Server notifications" tab from the inspector just doesn't work (version 0.3)

Had an issue where the database I was connected to was "_system" even though "account" was in the url, temporary fix is to take the database name as the url.
Ideally I'd like to be able to connect to all the databases.

Transactions work, took me a while to understand, but basically you have to begin a transaction and then do you query inside `transaction.step`.

I put the collections listing in a separate function, so that I can use it for the transactions.
The way to do read-only transactions is to pass to the transaction a `collections` parameter that has a `read` parameter that's an array of the name of the collections.
If you want to write to collections you have to pass them to `write`.
So by passing all the collections to `read` but none to `write` I can have read-only queries.
I've tested it by making a query with an `UPDATE` and it failed, while the one that simply returned a collection worked.

It works! I've asked Claude to list the collections, it tried to access them directly, failed but then apologized, ran another query and listed them all.
Then I asked if he noticed anything in `members`, and he told me that one member had an `updated_at` that was earlier than the `created_at`, and this was true! This is impressive.
It's the first time I can get a LLM to look at data instead of code, and it feels like a whole new world just opened.

So now it's time to make this a bit more professional.
I've been using the database we use for work to test it at first, but I don't want to leak our data, and I want anyone using this project to be able to develop.
For that we need a database, with collections in it.

Dev setup is done.
It's a bit heavy but also it's all you need to run everything.
Now I want to handle multiple databases.
For that, I want to go back to the model context protocol to understand what is a resource and what is a tool.

According to https://modelcontextprotocol.io/docs/concepts/resources, database records are a kind of resource.
For example `postgres://database/customers/schema` is a resource.
But I think this would mean `arangodb://ecommerce/users/108` would be a resource too: in the arangodb database "ecommerce", in the collection "users", the document with an `_key` of 108.
Database schemas (in arangodb JSONSchema) would be resources too.

There are two types of resources, text and binary resources.
Documents in arangodb are JSON data, so it's a text resource.
Log files and configuration files are also mentionned.
Does this apply to the MCP servers themselves, ie some kind of introspection where the MCP server exposes its own logs?
That would be interesting.
There are also another way to slice resources between two types: direct resources and resource templates.
Direct resources are exposed via the `resources/list` endpoint.
Each direct resource has a URI, and a human-readable name, with optional description and optional mime type.
Each URI template has a URI template that follows RFC 6570, a human readable name, an optional description and an optional mime type for all matching resources.
RFC 6570 defines URI templates like `/users/{id}`, so for our example with users above this could be `arangodb://ecommerce/users/{_key}` (`_key` is what arangodb calls id).
This could be even more generic: `arangodb://{databaseName}/{collectionName}/{documentID}` would be valid I think and covers basically any document in any arangodb database.
Huge caveat: regular documents, I don't know anything about other features that are not "arangodb as a document database" (graphs, AI, etc)
Let's go back to the MCP resource spec.
To read a resource, a client makes a `resources/read` request with the resource URI.
I think the LLM will be able to fill the URI template if needed.
There's a part with subscribe/unsubscribe, could be interesting to watch.
To handle `resources/read` requests you need to do `server.setRequestHandler(ReadResourceRequestSchema`.
The only thing guaranteed that you'll get is an URI.
I can work with that, provided I gave a usable template.
Let's implement `resources/read`!

First I need `resources/templates/list`: https://spec.modelcontextprotocol.io/specification/server/resources/#resource-templates
