const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(
    "./database.sqlite"
);


db.run(
    `
    UPDATE punti_vendita
    SET attivo = 1
    WHERE codice = ?
    `,
    [
        "ADMIN"
    ],
    function(err) {

        if (err) {

            console.error(err);

        } else {

            console.log(
                "ADMIN riattivato"
            );

        }

        db.close();

    }
);
