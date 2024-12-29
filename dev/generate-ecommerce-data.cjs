const fs = require('fs');
const path = require('path');

class SeededRandom {
    constructor(seed = 1) {
        this.seed = seed;
    }

    // Simple implementation of a seeded random number generator
    random() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }

    // Get random integer between min and max (inclusive)
    getRandomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    // Generate random string of specified length
    generateRandomString(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(this.random() * chars.length));
        }
        return result;
    }
}

function generateUsers(count = 100, rng) {
    const users = [];
    const roles = ['user', 'admin', 'editor', 'viewer'];
    const domains = ['example.com', 'test.com', 'demo.org', 'sample.net'];

    for (let i = 0; i < count; i++) {
        const firstName = `User${i + 1}`;
        const lastName = rng.generateRandomString(8);
        const email = `${firstName.toLowerCase()}.${lastName}@${domains[i % domains.length]}`;
        
        users.push({
            _key: `user${i + 1}`,
            firstName,
            lastName,
            email,
            role: roles[i % roles.length],
            createdAt: new Date(Date.now() - rng.getRandomInt(0, 365 * 24 * 60 * 60 * 1000)).toISOString(),
            isActive: rng.random() > 0.1,
            preferences: {
                newsletter: rng.random() > 0.5,
                notifications: rng.random() > 0.3,
                theme: rng.random() > 0.5 ? 'light' : 'dark'
            }
        });
    }

    return users;
}

function generateProducts(count = 200, rng) {
    const products = [];
    const categories = ['Electronics', 'Books', 'Clothing', 'Home & Garden', 'Sports'];
    const conditions = ['New', 'Like New', 'Used', 'Refurbished'];
    
    for (let i = 0; i < count; i++) {
        const name = `Product ${rng.generateRandomString(8)}`;
        const category = categories[i % categories.length];
        const basePrice = rng.getRandomInt(10, 1000);
        
        products.push({
            _key: `product${i + 1}`,
            name,
            category,
            description: `Description for ${name}`,
            price: basePrice,
            salePrice: rng.random() > 0.7 ? basePrice * 0.8 : null,
            condition: conditions[i % conditions.length],
            specifications: {
                weight: rng.getRandomInt(1, 100),
                dimensions: {
                    length: rng.getRandomInt(5, 50),
                    width: rng.getRandomInt(5, 50),
                    height: rng.getRandomInt(5, 50)
                }
            },
            inStock: rng.getRandomInt(0, 100),
            tags: [category.toLowerCase(), conditions[i % conditions.length].toLowerCase()],
            lastUpdated: new Date(Date.now() - rng.getRandomInt(0, 30 * 24 * 60 * 60 * 1000)).toISOString()
        });
    }

    return products;
}

// Get seed from command line argument or use default
const seed = parseInt(process.argv[2]) || 12345;
console.log(`Using seed: ${seed}`);

const rng = new SeededRandom(seed);

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Generate and save user data
const users = generateUsers(100, rng);
fs.writeFileSync(
    path.join(dataDir, 'users.json'),
    JSON.stringify(users, null, 2)
);
console.log('Generated users.json with', users.length, 'users');

// Generate and save product data
const products = generateProducts(200, rng);
fs.writeFileSync(
    path.join(dataDir, 'products.json'),
    JSON.stringify(products, null, 2)
);
console.log('Generated products.json with', products.length, 'products');