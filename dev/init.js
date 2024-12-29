const db = require('@arangodb').db;
const fs = require('fs');

// Helper function to create database if it doesn't exist
function createDatabase(dbName) {
    if (!db._databases().includes(dbName)) {
        db._createDatabase(dbName);
        console.log(`Created database: ${dbName}`);
    }
}

// Helper function to initialize a collection with data
function initializeCollection(database, collectionName, dataFile) {
    const collection = database._collection(collectionName);
    
    // Read and parse the JSON data file
    const dataPath = `/docker-entrypoint-initdb.d/data/${dataFile}`;
    if (fs.exists(dataPath)) {
        const data = JSON.parse(fs.read(dataPath));
        
        // Insert the documents
        data.forEach(doc => {
            collection.save(doc, { overwrite: true });
        });
        
        console.log(`Loaded ${data.length} documents into ${collectionName}`);
    }
}

// Helper function to ensure collection exists
function ensureCollection(database, collectionName) {
    if (!database._collection(collectionName)) {
        database._createDocumentCollection(collectionName);
        console.log(`Created collection: ${collectionName}`);
    }
    return database._collection(collectionName);
}

// Initialize e-commerce database
const ecommerceDbName = 'ecommerce_db';
createDatabase(ecommerceDbName);
const ecommerceDb = require('@arangodb').db._useDatabase(ecommerceDbName);

// Create and initialize e-commerce collections
ensureCollection(ecommerceDb, 'users');
ensureCollection(ecommerceDb, 'products');
initializeCollection(ecommerceDb, 'users', 'users.json');
initializeCollection(ecommerceDb, 'products', 'products.json');

// Initialize library database
const libraryDbName = 'library_db';
createDatabase(libraryDbName);
const libraryDb = require('@arangodb').db._useDatabase(libraryDbName);

// Create and initialize library collections
ensureCollection(libraryDb, 'authors');
ensureCollection(libraryDb, 'books');
ensureCollection(libraryDb, 'borrowings');
initializeCollection(libraryDb, 'authors', 'authors.json');
initializeCollection(libraryDb, 'books', 'books.json');
initializeCollection(libraryDb, 'borrowings', 'borrowings.json');