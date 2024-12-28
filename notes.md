I'm trying to understand what the postgres mcp server does. First, the `ListResourcesRequestSchema`. The comment says "Sent from the client to request a list of resources the server has". For postgres, for each table it returns a resource URI that contains the JSON schema information for each table, column names, data types. For arango, this won't really work for collections as they're "untyped", unless the collection has a schema set. Still, we can return all collections.

I had some troubles with zod and extracting the array from the promises and the cursor stuff with arangojs, but it seems fixed now. Now to run it properly, I'll try the mcp inspector.

MCP inspector works well, but now I think the connection to arangodb doesn't work as expected. I'm trying to add logging but I think this is causing issues too, I got an error "server does not implement logging", and "throw new Error("Not connected"); ^ Error: Not connected at Server.notification".

Seems like the "Server notifications" tab from the inspector just doesn't work (version 0.3)

Had an issue where the database I was connected to was "_system" even though "account" was in the url, temporary fix is to take the database name as the url. Ideally I'd like to be able to connect to all the databases.

Transactions work, took me a while to understand, but basically you have to begin a transaction and then do you query inside `transaction.step`.

I put the collections listing in a separate function, so that I can use it for the transactions. The way to do read-only transactions is to pass to the transaction a `collections` parameter that has a `read` parameter that's an array of the name of the collections. If you want to write to collections you have to pass them to `write`. So by passing all the collections to `read` but none to `write` I can have read-only queries. I've tested it by making a query with an `UPDATE` and it failed, while the one that simply returned a collection worked.

It works! I've asked Claude to list the collections, it tried to access them directly, failed but then apologized, ran another query and listed them all. Then I asked if he noticed anything in `members`, and he told me that one member had an `updated_at` that was earlier than the `created_at`, and this was true! This is impressive. It's the first time I can get a LLM to look at data instead of code, and it feels like a whole new world just opened.