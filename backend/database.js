const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(
    "./database.sqlite",
    (err) => {

        if (err) {
            console.log("Errore database:", err);
        } else {
            console.log("Database collegato");
        }

    }
);


db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS punti_vendita (

            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            codice TEXT UNIQUE,
            password TEXT,
            attivo INTEGER DEFAULT 1

        )
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS ordini (

            id INTEGER PRIMARY KEY AUTOINCREMENT,
            puntoVenditaId INTEGER,
            stato TEXT

        )
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS dettagli_ordine (

            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ordineId INTEGER,
            codice TEXT,
            descrizione TEXT,
            quantita INTEGER

        )
    `);

});


module.exports = db;
