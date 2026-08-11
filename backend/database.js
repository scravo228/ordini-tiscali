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

    db.get(
        `SELECT id FROM punti_vendita WHERE codice = ?`,
        ["STAMPU01"],
        (err, riga) => {

            if (err) {

                console.error(
                    "Errore controllo STAMPU01:",
                    err
                );

                return;
            }

            if (!riga) {

                db.run(
                    `
                    INSERT INTO punti_vendita
                    (nome, codice, password, attivo)
                    VALUES (?, ?, ?, 1)
                    `,
                    [
                        "STAMPU",
                        "STAMPU01",
                        "1234"
                    ],
                    (err) => {

                        if (err) {

                            console.error(
                                "Errore creazione STAMPU01:",
                                err
                            );

                        } else {

                            console.log(
                                "Punto vendita STAMPU01 creato"
                            );

                        }

                    }
                );

            } else {

                console.log(
                    "STAMPU01 già presente"
                );

            }

        }
    );

});

module.exports = db;
