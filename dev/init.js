const db = require('@arangodb').db;
const fs = require('fs');

function createDatabase(dbName) {
    // Switch to _system database first
    db._useDatabase('_system');
    
    if (!db._databases().includes(dbName)) {
        db._createDatabase(dbName);
        console.log(`Created database: ${dbName}`);
    }
}

// Rest of the functions remain the same
function initializeCollection(dbName, collectionName, dataFile) {
    db._useDatabase(dbName);
    const collection = db._collection(collectionName);
    
    const dataPath = `/docker-entrypoint-initdb.d/data/${dataFile}`;
    if (fs.exists(dataPath)) {
        const data = JSON.parse(fs.read(dataPath));
        data.forEach(doc => {
            collection.save(doc, { overwrite: true });
        });
        console.log(`Loaded ${data.length} documents into ${collectionName}`);
    }
}

function ensureCollection(dbName, collectionName) {
    db._useDatabase(dbName);
    if (!db._collection(collectionName)) {
        db._createDocumentCollection(collectionName);
        console.log(`Created collection: ${collectionName}`);
    }
    return db._collection(collectionName);
}

// Start by ensuring we're in the system database
db._useDatabase('_system');

// Initialize e-commerce database
const ecommerceDbName = 'ecommerce_db';
createDatabase(ecommerceDbName);

// Create and initialize e-commerce collections
ensureCollection(ecommerceDbName, 'users');
ensureCollection(ecommerceDbName, 'products');
initializeCollection(ecommerceDbName, 'users', 'users.json');
initializeCollection(ecommerceDbName, 'products', 'products.json');

// Initialize library database
const libraryDbName = 'library_db';
createDatabase(libraryDbName);

// Create and initialize library collections
ensureCollection(libraryDbName, 'authors');
ensureCollection(libraryDbName, 'books');
ensureCollection(libraryDbName, 'borrowings');
initializeCollection(libraryDbName, 'authors', 'authors.json');
initializeCollection(libraryDbName, 'books', 'books.json');
initializeCollection(libraryDbName, 'borrowings', 'borrowings.json');