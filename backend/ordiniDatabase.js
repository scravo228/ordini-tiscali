const db = require("./database");


function creaOrdine(puntoVenditaId, callback) {

    db.run(
        `
        INSERT INTO ordini
        (puntoVenditaId, stato)

        VALUES (?, ?)
        `,
        [
            puntoVenditaId,
            "APERTO"
        ],
        function(err) {

            if (err) {

                callback(err);

            } else {

                callback(null, this.lastID);

            }

        }
    );

}



function aggiungiProdottoOrdine(
    ordineId,
    codice,
    descrizione,
    quantita,
    callback
) {

    db.get(
        `
        SELECT *
        FROM dettagli_ordine
        WHERE ordineId = ?
        AND codice = ?
        `,
        [
            ordineId,
            codice
        ],
        (err, prodotto) => {


            if(err){

                callback(err);
                return;

            }


            if(prodotto){


                db.run(
                    `
                    UPDATE dettagli_ordine
                    SET quantita = ?
                    WHERE id = ?
                    `,
                    [
                        quantita,
                        prodotto.id
                    ],
                    function(err){


                        if(err){

                            callback(err);

                        } else {

                            callback(null, prodotto.id);

                        }


                    }
                );


            } else {


                db.run(
                    `
                    INSERT INTO dettagli_ordine
(ordineId, codice, descrizione, quantita)

VALUES (?, ?, ?, ?)
                    `,
                    [
                        ordineId,
    codice,
    descrizione,
    quantita
                    ],
                    function(err){


                        if(err){

                            callback(err);

                        } else {

                            callback(null, this.lastID);

                        }


                    }
                );


            }


        }
    );

}function getOrdineAperto(puntoVenditaId, callback) {

    db.get(
        `
        SELECT *
        FROM ordini
        WHERE puntoVenditaId = ?
        AND stato = 'APERTO'
        `,
        [
            puntoVenditaId
        ],
        (err, ordine) => {

            if (err) {

                callback(err);

            } else if (!ordine) {

                callback(null, null);

            } else {

                db.all(
                    `
                    SELECT codice, quantita
                    FROM dettagli_ordine
                    WHERE ordineId = ?
                    `,
                    [
                        ordine.id
                    ],
                    (err, prodotti) => {

                        if (err) {

                            callback(err);

                        } else {

                            callback(null, {

                                ordineId:
                                    ordine.id,

                                puntoVenditaId:
                                    ordine.puntoVenditaId,

                                stato:
                                    ordine.stato,

                                prodotti:
                                    prodotti

                            });

                        }

                    }
                );

            }

        }
    );
}
function modificaQuantitaOrdine(
    ordineId,
    codice,
    quantita,
    callback
) {


    db.run(
        `
        UPDATE dettagli_ordine
        SET quantita = ?
        WHERE ordineId = ?
        AND codice = ?
        `,
        [
            quantita,
            ordineId,
            codice
        ],
        function(err) {


            if(err){

                callback(err);

            } else {

                callback(null, this.changes);

            }


        }
    );


}
function eliminaProdottoOrdine(
    ordineId,
    codice,
    callback
) {

    db.run(
        `
        DELETE FROM dettagli_ordine
        WHERE ordineId = ?
        AND codice = ?
        `,
        [
            ordineId,
            codice
        ],
        function(err) {

            if(err){

                callback(err);

            } else {

                callback(null, this.changes);

            }

        }
    );

}
function azzeraOrdineDatabase(
    ordineId,
    callback
) {


    db.run(
        `
        DELETE FROM dettagli_ordine
        WHERE ordineId = ?
        `,
        [
            ordineId
        ],
        function(err) {


            if(err){

                callback(err);

            } else {

                callback(null, this.changes);

            }


        }
    );


}
function azzeraOrdine(ordineId, callback){

    db.run(
        `
        DELETE FROM dettagli_ordine
        WHERE ordineId = ?
        `,
        [
            ordineId
        ],
        function(err){

            callback(err);

        }
    );

}
function getOrdine(ordineId, callback){

    db.all(
        `
        SELECT codice, descrizione, quantita
        FROM dettagli_ordine
        WHERE ordineId = ?
        `,
        [
            ordineId
        ],
        (err, prodotti)=>{

            if(err){

                callback(err);
                return;

            }


            callback(null, {

                puntoVenditaId: 1,

                stato: "APERTO",

                prodotti: prodotti

            });

        }
    );

}
function apriOrdine(
    puntoVenditaId,
    callback
) {


    db.get(
        `
        SELECT *
        FROM ordini
        WHERE puntoVenditaId = ?
        AND stato = 'APERTO'
        `,
        [
            puntoVenditaId
        ],
        (err, ordine) => {


            if(err){

                callback(err);

            }
            else if(ordine){

                callback(null, ordine.id);

            }
            else {


                db.run(
                    `
                    INSERT INTO ordini
                    (puntoVenditaId, stato)

                    VALUES (?, ?)
                    `,
                    [
                        puntoVenditaId,
                        "APERTO"
                    ],
                    function(err) {


                        if(err){

                            callback(err);

                        } else {

                            callback(null, this.lastID);

                        }


                    }
                );


            }


        }
    );


}
function getOrdineById(ordineId, callback) {

    db.get(
        `
        SELECT *
        FROM ordini
        WHERE id = ?
        `,
        [ordineId],
        (err, ordine) => {

            if (err) {
                return callback(err);
            }

            if (!ordine) {
                return callback(
                    new Error("Ordine non trovato")
                );
            }

            db.all(
                `
                SELECT
                    codice,
                    descrizione,
                    quantita
                FROM dettagli_ordine
                WHERE ordineId = ?
                `,
                [ordineId],
                (err, prodotti) => {

                    if (err) {
                        return callback(err);
                    }

                    callback(null, {
                        ordineId: ordine.id,
                        puntoVenditaId:
                            ordine.puntoVenditaId,
                        stato: ordine.stato,
                        prodotti: prodotti
                    });

                }
            );

        }
    );

}
function chiudiOrdine(ordineId, callback) {

    db.run(
        `
        UPDATE ordini
        SET stato = 'INVIATO'
        WHERE id = ?
        `,
        [
            ordineId
        ],
        function(err) {

            if (err) {

                callback(err);

            } else {

                callback(null, this.changes);

            }

        }
    );

}

function chiudiOrdine(ordineId, callback) {

    db.run(
        `
        UPDATE ordini
        SET stato = ?
        WHERE id = ?
        `,
        [
            "INVIATO",
            ordineId
        ],
        function(err) {

            if (err) {

                callback(err);

            } else {

                callback(null, this.changes);

            }

        }
    );

}

function creaPuntoVendita(
    nome,
    codice,
    password,
    tiscaliUsername,
    tiscaliPassword
) {

    db.run(
        `
        INSERT INTO punti_vendita
        (
            nome,
            codice,
            password,
            ruolo,
            tiscaliUsername,
            tiscaliPassword,
            attivo
        )
        VALUES
        (?, ?, ?, 'negozio', ?, ?, 1)
        `,
        [
            nome,
            codice,
            password,
            tiscaliUsername,
            tiscaliPassword
        ],
        function(err) {

            if (err) {

                console.error(
                    "Errore creazione punto vendita:",
                    err
                );

                return;

            }

            console.log(
                "Punto vendita creato ID:",
                this.lastID
            );

        }
    );

}
function verificaLogin(codice, password, callback) {

    db.get(
        `
        SELECT *
        FROM punti_vendita
        WHERE codice = ?
        AND password = ?
        AND attivo = 1
        `,
        [
            codice,
            password
        ],
        (err, puntoVendita) => {

            if (err) {
                callback(err, null);
                return;
            }

            callback(null, puntoVendita);
        }
    );

}
db.run(`
    ALTER TABLE punti_vendita
    ADD COLUMN ruolo TEXT DEFAULT 'negozio'
`, (err) => {

    if (
        err &&
        !err.message.includes("duplicate column")
    ) {
        console.error(err);
    }

});


db.run(`
    ALTER TABLE punti_vendita
    ADD COLUMN tiscaliUsername TEXT
`, (err) => {

    if (
        err &&
        !err.message.includes("duplicate column")
    ) {
        console.error(err);
    }

});


db.run(`
    ALTER TABLE punti_vendita
    ADD COLUMN tiscaliPassword TEXT
`, (err) => {

    if (
        err &&
        !err.message.includes("duplicate column")
    ) {
        console.error(err);
    }

});
function creaAmministratore(codice, password, callback) {

    db.run(
        `
        INSERT INTO punti_vendita
        (nome, codice, password, ruolo, attivo)
        VALUES (?, ?, ?, 'amministratore', 1)
        `,
        [
            "Amministratore",
            codice,
            password
        ],
        function (err) {

            if (err) {

                console.error(
                    "Errore creazione amministratore:",
                    err
                );

                callback(err);
                return;
            }

            console.log(
                "Amministratore creato con ID:",
                this.lastID
            );

            callback(null, this.lastID);

        }
    );

}
function getPuntoVenditaById(id, callback) {

    db.get(
        `
        SELECT *
        FROM punti_vendita
        WHERE id = ?
        `,
        [
            id
        ],
        (err, puntoVendita) => {

            if (err) {

                callback(
                    err,
                    null
                );

                return;
            }


            callback(
                null,
                puntoVendita
            );

        }
    );

}
function getTuttiPuntiVendita(callback) {


    db.all(
        `
        SELECT 
            id,
            nome,
            codice,
            ruolo,
            attivo
        FROM punti_vendita
        ORDER BY nome
        `,
        [],
        (err, punti) => {


            if (err) {

                callback(
                    err,
                    null
                );

                return;

            }


            callback(
                null,
                punti
            );


        }
    );

}
function disattivaPuntoVendita(id, callback) {

    db.run(
        `
        UPDATE punti_vendita
        SET attivo = 0
        WHERE id = ?
        `,
        [
            id
        ],
        function(err) {

            if (err) {

                callback(err);
                return;

            }

            callback(null);

        }
    );

}
function modificaPuntoVendita(
    id,
    nome,
    codice,
    password,
    tiscaliUsername,
    tiscaliPassword,
    callback
) {

    const dati = {

        nome: nome,

        codice: codice,

        tiscaliUsername:
            tiscaliUsername || "",

        tiscaliPassword:
            tiscaliPassword || ""

    };

    // La password viene modificata SOLO
    // se ne è stata inserita una nuova
    if (
        password !== undefined &&
        password !== null &&
        String(password).trim() !== ""
    ) {

        dati.password =
            String(password).trim();

    }

    supabase
        .from("punti_vendita")
        .update(dati)
        .eq("id", id)

        .then(({ error }) => {

            if (error) {

                callback(error);
                return;

            }

            callback(null);

        })

        .catch(callback);

}
function aggiornaMioAccount(
    id,
    password,
    tiscaliUsername,
    tiscaliPassword,
    callback
) {

    const dati = {

        tiscaliUsername:
            tiscaliUsername || "",

        tiscaliPassword:
            tiscaliPassword || ""

    };

    // La password viene modificata SOLO
    // se ne viene inserita una nuova
    if (
        password !== undefined &&
        password !== null &&
        String(password).trim() !== ""
    ) {

        dati.password =
            String(password).trim();

    }

    supabase
        .from("punti_vendita")
        .update(dati)
        .eq("id", id)

        .then(({ error }) => {

            if (error) {

                callback(error);
                return;

            }

            callback(null);

        })

        .catch(callback);

}
function riattivaPuntoVendita(id, callback) {

    db.run(
        `
        UPDATE punti_vendita
        SET attivo = 1
        WHERE id = ?
        `,
        [
            id
        ],
        function(err) {

            if (err) {

                callback(err);
                return;

            }


            callback(null);

        }
    );

}

module.exports = {

    creaOrdine,
    apriOrdine,
    aggiungiProdottoOrdine,
    getOrdineAperto,
    modificaQuantitaOrdine,
    eliminaProdottoOrdine,
    azzeraOrdineDatabase,
    azzeraOrdine,
    getOrdine,
getOrdineById,
chiudiOrdine,
creaPuntoVendita,
verificaLogin,
creaAmministratore,
getPuntoVenditaById,
getTuttiPuntiVendita,
disattivaPuntoVendita,
modificaPuntoVendita,
aggiornaMioAccount,
riattivaPuntoVendita

};