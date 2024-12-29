const fs = require('fs');
const path = require('path');

class SeededRandom {
    constructor(seed = 1) {
        this.seed = seed;
    }

    random() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }

    getRandomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    generateRandomString(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(this.random() * chars.length));
        }
        return result;
    }

    pickRandom(array) {
        return array[Math.floor(this.random() * array.length)];
    }

    pickMultiple(array, min, max) {
        const count = this.getRandomInt(min, max);
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(this.pickRandom(array));
        }
        return [...new Set(result)]; // Remove duplicates
    }
}

function generateAuthors(count = 50, rng) {
    const nationalities = ['American', 'British', 'Canadian', 'Australian', 'Irish', 'Indian', 'Japanese'];
    const genres = ['Fiction', 'Science Fiction', 'Mystery', 'Romance', 'Historical', 'Fantasy', 'Non-Fiction'];
    
    const authors = [];
    for (let i = 0; i < count; i++) {
        const firstName = `Author${rng.generateRandomString(5)}`;
        const lastName = rng.generateRandomString(8);
        
        authors.push({
            _key: `author${i + 1}`,
            firstName,
            lastName,
            nationality: rng.pickRandom(nationalities),
            birthYear: rng.getRandomInt(1920, 2000),
            primaryGenres: rng.pickMultiple(genres, 1, 3),
            biography: `${firstName} ${lastName} is a renowned author known for their work in ${rng.pickRandom(genres)}.`,
            awards: rng.getRandomInt(0, 5)
        });
    }
    return authors;
}

function generateBooks(count = 150, authorKeys, rng) {
    const genres = ['Fiction', 'Science Fiction', 'Mystery', 'Romance', 'Historical', 'Fantasy', 'Non-Fiction'];
    const languages = ['English', 'Spanish', 'French', 'German', 'Japanese'];
    const publishers = ['Penguin', 'Random House', 'HarperCollins', 'Simon & Schuster', 'Macmillan'];
    
    const books = [];
    for (let i = 0; i < count; i++) {
        const publishYear = rng.getRandomInt(1950, 2024);
        const title = `The ${rng.generateRandomString(8)} ${rng.generateRandomString(6)}`;
        
        books.push({
            _key: `book${i + 1}`,
            title,
            authorKey: rng.pickRandom(authorKeys),
            isbn: `978${rng.getRandomInt(1000000000, 9999999999)}`,
            genre: rng.pickRandom(genres),
            publishYear,
            language: rng.pickRandom(languages),
            publisher: rng.pickRandom(publishers),
            pages: rng.getRandomInt(100, 1000),
            copies: rng.getRandomInt(1, 10),
            rating: Math.round(rng.random() * 40 + 10) / 10, // 1.0 to 5.0
            summary: `A compelling ${rng.pickRandom(genres).toLowerCase()} book published in ${publishYear}.`
        });
    }
    return books;
}

function generateBorrowings(count = 300, bookKeys, rng) {
    const borrowings = [];
    const currentDate = new Date();
    
    for (let i = 0; i < count; i++) {
        const daysAgo = rng.getRandomInt(1, 365);
        const borrowDate = new Date(currentDate - daysAgo * 24 * 60 * 60 * 1000);
        const duration = rng.getRandomInt(7, 30);
        const returnDate = new Date(borrowDate.getTime() + duration * 24 * 60 * 60 * 1000);
        const isReturned = returnDate < currentDate;
        
        borrowings.push({
            _key: `borrowing${i + 1}`,
            bookKey: rng.pickRandom(bookKeys),
            borrowerId: `patron${rng.getRandomInt(1, 1000)}`,
            borrowDate: borrowDate.toISOString(),
            dueDate: returnDate.toISOString(),
            returnDate: isReturned ? returnDate.toISOString() : null,
            status: isReturned ? 'returned' : 'borrowed',
            renewalCount: rng.getRandomInt(0, 3)
        });
    }
    return borrowings;
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

// Generate data in the correct order to maintain references
const authors = generateAuthors(50, rng);
fs.writeFileSync(
    path.join(dataDir, 'authors.json'),
    JSON.stringify(authors, null, 2)
);
console.log('Generated authors.json with', authors.length, 'authors');

const authorKeys = authors.map(author => author._key);
const books = generateBooks(150, authorKeys, rng);
fs.writeFileSync(
    path.join(dataDir, 'books.json'),
    JSON.stringify(books, null, 2)
);
console.log('Generated books.json with', books.length, 'books');

const bookKeys = books.map(book => book._key);
const borrowings = generateBorrowings(300, bookKeys, rng);
fs.writeFileSync(
    path.join(dataDir, 'borrowings.json'),
    JSON.stringify(borrowings, null, 2)
);
console.log('Generated borrowings.json with', borrowings.length, 'borrowings');