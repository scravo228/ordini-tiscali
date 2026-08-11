const db = require("./database");

db.run(
    `
    INSERT OR IGNORE INTO punti_vendita (id, nome)
    VALUES (?, ?)
    `,
    [
        1,
        "Pizzeria Cagliari"
    ],
    function(err) {

        if (err) {

            console.log(
                "Errore:",
                err.message
            );

        } else {

            console.log(
                "Controllo punto vendita completato"
            );

        }

        db.close();

    }
);