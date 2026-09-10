const supabase = require("./database");


// =====================================================
// CREA ORDINE
// =====================================================

function creaOrdine(puntoVenditaId, callback) {

    supabase
        .from("ordini")
        .insert({
            puntoVenditaId: puntoVenditaId,
            stato: "APERTO"
        })
        .select("id")
        .single()

        .then(({ data, error }) => {

            if (error) {
                callback(error);
                return;
            }

            callback(null, data.id);

        })

        .catch(callback);

}


// =====================================================
// APRI ORDINE
// =====================================================

function apriOrdine(puntoVenditaId, callback) {

    supabase
        .from("ordini")
        .select("*")
        .eq("puntoVenditaId", puntoVenditaId)
        .eq("stato", "APERTO")
        .limit(1)

        .then(async ({ data, error }) => {

            if (error) {
                callback(error);
                return;
            }

            if (data && data.length > 0) {

                callback(null, data[0].id);
                return;

            }

            const risultato =
                await supabase
                    .from("ordini")
                    .insert({
                        puntoVenditaId: puntoVenditaId,
                        stato: "APERTO"
                    })
                    .select("id")
                    .single();

            if (risultato.error) {
                callback(risultato.error);
                return;
            }

            callback(null, risultato.data.id);

        })

        .catch(callback);

}


// =====================================================
// AGGIUNGI PRODOTTO
// =====================================================

function aggiungiProdottoOrdine(
    ordineId,
    codice,
    descrizione,
    quantita,
    callback
) {

    supabase
        .from("dettagli_ordine")
        .upsert(
            {
                ordineId: ordineId,
                codice: codice,
                descrizione: descrizione,
                quantita: quantita
            },
            {
                onConflict: "ordineId,codice"
            }
        )
        .select("id")
        .single()

        .then(({ data, error }) => {

            if (error) {
                callback(error);
                return;
            }

            callback(null, data.id);

        })

        .catch(callback);

}


// =====================================================
// ORDINE APERTO
// =====================================================

function getOrdineAperto(
    puntoVenditaId,
    callback
) {

    supabase
        .from("ordini")
        .select("*")
        .eq("puntoVenditaId", puntoVenditaId)
        .eq("stato", "APERTO")
        .limit(1)

        .then(async ({ data, error }) => {

            if (error) {
                callback(error);
                return;
            }

            if (!data || data.length === 0) {

                callback(null, null);
                return;

            }

            const ordine = data[0];

            const risultato =
                await supabase
                    .from("dettagli_ordine")
                    .select("codice, descrizione, quantita")
                    .eq("ordineId", ordine.id);

            if (risultato.error) {
                callback(risultato.error);
                return;
            }

            callback(null, {

                ordineId: ordine.id,

                puntoVenditaId:
                    ordine.puntoVenditaId,

                stato:
                    ordine.stato,

                prodotti:
                    risultato.data || []

            });

        })

        .catch(callback);

}


// =====================================================
// MODIFICA QUANTITÀ
// =====================================================

function modificaQuantitaOrdine(
    ordineId,
    codice,
    quantita,
    callback
) {

    // -------------------------------------------------
    // CERCA SE IL PRODOTTO ESISTE GIÀ
    // -------------------------------------------------

    supabase
        .from("dettagli_ordine")
        .select("id, descrizione")
        .eq("ordineId", ordineId)
        .eq("codice", codice)
        .limit(1)

        .then(async ({ data, error }) => {

            if (error) {
                callback(error);
                return;
            }


            // -------------------------------------------------
            // PRODOTTO GIÀ PRESENTE
            // -------------------------------------------------

            if (
                data &&
                data.length > 0
            ) {

                const risultato =
                    await supabase
                        .from("dettagli_ordine")
                        .update({
                            quantita: quantita
                        })
                        .eq("id", data[0].id);

                if (risultato.error) {

                    callback(
                        risultato.error
                    );

                    return;

                }

                callback(
                    null,
                    1
                );

                return;

            }


            // -------------------------------------------------
            // PRODOTTO NON PRESENTE
            // LO INSERIAMO
            // -------------------------------------------------

            const risultato =
                await supabase
                    .from("dettagli_ordine")
                    .insert({

                        ordineId:
                            ordineId,

                        codice:
                            codice,

                        descrizione:
                            "",

                        quantita:
                            quantita

                    })
                    .select("id")
                    .single();


            if (risultato.error) {

                callback(
                    risultato.error
                );

                return;

            }


            console.log(
                "PRODOTTO INSERITO NELL'ORDINE:",
                codice,
                "quantità:",
                quantita
            );


            callback(
                null,
                risultato.data.id
            );

        })

        .catch(callback);

}
// =====================================================
// MODIFICA CODICE PRODOTTO NELL'ORDINE APERTO
// =====================================================

function modificaCodiceProdottoOrdine(
    ordineId,
    vecchioCodice,
    nuovoCodice,
    callback
) {

    console.log(
        "MODIFICA CODICE ORDINE:",
        ordineId,
        vecchioCodice,
        "→",
        nuovoCodice
    );


    // =====================================================
    // 1. CERCA PRIMA LA RIGA CORRETTA
    // =====================================================

    supabase
        .from("dettagli_ordine")
        .select("id, codice, descrizione, quantita")
        .eq("ordineId", ordineId)
        .eq("codice", vecchioCodice)
        .limit(1)

        .then(async ({ data, error }) => {

            if (error) {

                callback(error);
                return;

            }


            // =================================================
            // NESSUNA RIGA TROVATA
            // =================================================

            if (
                !data ||
                data.length === 0
            ) {

                console.log(
                    "NESSUN PRODOTTO TROVATO NELL'ORDINE:",
                    ordineId,
                    vecchioCodice
                );

                callback(
                    null,
                    {
                        modificati: 0,
                        trovato: false
                    }
                );

                return;

            }


            const riga =
                data[0];


            console.log(
                "RIGA ORDINE TROVATA:",
                riga
            );


            // =================================================
            // 2. MODIFICA LA RIGA TRAMITE IL SUO ID
            // =================================================

            const risultato =
                await supabase
                    .from("dettagli_ordine")
                    .update({
                        codice:
                            nuovoCodice
                    })
                    .eq(
                        "id",
                        riga.id
                    )
                    .select(
                        "id, codice, descrizione, quantita"
                    );


            if (risultato.error) {

                callback(
                    risultato.error
                );

                return;

            }


            console.log(
                "CODICE ORDINE MODIFICATO:",
                risultato.data
            );


            callback(
                null,
                {
                    modificati:
                        risultato.data
                            ? risultato.data.length
                            : 0,

                    trovato: true,

                    prodotto:
                        risultato.data?.[0] ||
                        null
                }
            );

        })

        .catch(callback);

}


// =====================================================
// ELIMINA PRODOTTO
// =====================================================

function eliminaProdottoOrdine(
    ordineId,
    codice,
    callback
) {

    supabase
        .from("dettagli_ordine")
        .delete()
        .eq("ordineId", ordineId)
        .eq("codice", codice)

        .then(({ error }) => {

            if (error) {
                callback(error);
                return;
            }

            callback(null, 1);

        })

        .catch(callback);

}


// =====================================================
// AZZERA ORDINE
// =====================================================

function azzeraOrdine(
    ordineId,
    callback
) {

    supabase
        .from("dettagli_ordine")
        .delete()
        .eq("ordineId", ordineId)

        .then(({ error }) => {

            if (error) {
                callback(error);
                return;
            }

            callback(null);

        })

        .catch(callback);

}


// Compatibilità con il vecchio nome
function azzeraOrdineDatabase(
    ordineId,
    callback
) {

    azzeraOrdine(
        ordineId,
        callback
    );

}


// =====================================================
// GET ORDINE
// =====================================================

function getOrdine(
    ordineId,
    callback
) {

    supabase
        .from("ordini")
        .select("*")
        .eq("id", ordineId)
        .single()

        .then(async ({ data: ordine, error }) => {

            if (error) {
                callback(error);
                return;
            }

            const risultato =
                await supabase
                    .from("dettagli_ordine")
                    .select(
                        "codice, descrizione, quantita"
                    )
                    .eq("ordineId", ordineId);

            if (risultato.error) {
                callback(risultato.error);
                return;
            }

            callback(null, {

                ordineId:
                    ordine.id,

                puntoVenditaId:
                    ordine.puntoVenditaId,

                stato:
                    ordine.stato,

                prodotti:
                    risultato.data || []

            });

        })

        .catch(callback);

}


// =====================================================
// GET ORDINE BY ID
// =====================================================

function getOrdineById(
    ordineId,
    callback
) {

    getOrdine(
        ordineId,
        callback
    );

}


// =====================================================
// CHIUDI ORDINE
// =====================================================

function chiudiOrdine(
    ordineId,
    callback
) {

    supabase
        .from("ordini")
        .update({
            stato: "INVIATO"
        })
        .eq("id", ordineId)

        .then(({ error }) => {

            if (error) {
                callback(error);
                return;
            }

            callback(null, 1);

        })

        .catch(callback);

}


// =====================================================
// CREA PUNTO VENDITA
// =====================================================

function creaPuntoVendita(
    nome,
    codice,
    password,
    tiscaliUsername,
    tiscaliPassword,
    callback = () => {}
) {

    supabase
        .from("punti_vendita")
        .insert({

            nome: nome,

            codice: codice,

            password: password,

            ruolo: "negozio",

            tiscaliUsername:
                tiscaliUsername || "",

            tiscaliPassword:
                tiscaliPassword || "",

            attivo: 1

        })
        .select("id")
        .single()

        .then(({ data, error }) => {

            if (error) {
                console.error(
                    "Errore creazione punto vendita:",
                    error
                );

                callback(error);
                return;
            }

            console.log(
                "Punto vendita creato ID:",
                data.id
            );

            callback(null, data.id);

        })

        .catch(callback);

}


// =====================================================
// LOGIN PUNTO VENDITA / ADMIN
// =====================================================

function verificaLogin(
    codice,
    password,
    callback
) {

    // -------------------------------------------------
    // PRIMA CERCA ADMIN
    // -------------------------------------------------

    supabase
        .from("amministratori")
        .select("*")
        .eq("username", codice)
        .eq("password", password)
        .eq("attivo", 1)
        .limit(1)

        .then(async ({ data: adminData, error }) => {

            if (error) {
                callback(error, null);
                return;
            }

            if (
                adminData &&
                adminData.length > 0
            ) {

                const admin =
                    adminData[0];

                callback(null, {

                    id: admin.id,

                    nome:
                        admin.nome || "Amministratore",

                    codice:
                        admin.username,

                    ruolo:
                        "amministratore",

                    attivo:
                        admin.attivo

                });

                return;

            }

            // -----------------------------------------
            // POI CERCA PUNTO VENDITA
            // -----------------------------------------

            const risultato =
                await supabase
                    .from("punti_vendita")
                    .select("*")
                    .eq("codice", codice)
                    .eq("password", password)
                    .eq("attivo", 1)
                    .limit(1);

            if (risultato.error) {
                callback(
                    risultato.error,
                    null
                );
                return;
            }

            if (
                risultato.data &&
                risultato.data.length > 0
            ) {

                callback(
                    null,
                    risultato.data[0]
                );

                return;

            }

            callback(null, null);

        })

        .catch(err => {

            callback(
                err,
                null
            );

        });

}


// =====================================================
// CREA AMMINISTRATORE
// =====================================================

function creaAmministratore(
    username,
    password,
    callback
) {

    supabase
        .from("amministratori")
        .insert({

            username: username,

            password: password,

            nome: "Amministratore",

            attivo: 1

        })
        .select("id")
        .single()

        .then(({ data, error }) => {

            if (error) {

                console.error(
                    "Errore creazione amministratore:",
                    error
                );

                callback(error);
                return;

            }

            console.log(
                "Amministratore creato ID:",
                data.id
            );

            callback(
                null,
                data.id
            );

        })

        .catch(callback);

}


// =====================================================
// PUNTO VENDITA BY ID
// =====================================================

function getPuntoVenditaById(
    id,
    callback
) {

    supabase
        .from("punti_vendita")
        .select("*")
        .eq("id", id)
        .limit(1)

        .then(({ data, error }) => {

            if (error) {
                callback(error, null);
                return;
            }

            callback(
                null,
                data && data.length > 0
                    ? data[0]
                    : null
            );

        })

        .catch(err => {

            callback(
                err,
                null
            );

        });

}


// =====================================================
// TUTTI I PUNTI VENDITA
// =====================================================

function getTuttiPuntiVendita(
    callback
) {

    supabase
        .from("punti_vendita")
        .select(
            "id, nome, codice, ruolo, attivo"
        )
        .order("nome", {
            ascending: true
        })

        .then(({ data, error }) => {

            if (error) {
                callback(error, null);
                return;
            }

            callback(
                null,
                data || []
            );

        })

        .catch(err => {

            callback(
                err,
                null
            );

        });

}


// =====================================================
// DISATTIVA PUNTO VENDITA
// =====================================================

function disattivaPuntoVendita(
    id,
    callback
) {

    supabase
        .from("punti_vendita")
        .update({
            attivo: 0
        })
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


// =====================================================
// RIATTIVA PUNTO VENDITA
// =====================================================

function riattivaPuntoVendita(
    id,
    callback
) {

    supabase
        .from("punti_vendita")
        .update({
            attivo: 1
        })
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


// =====================================================
// MODIFICA PUNTO VENDITA
// =====================================================

function modificaPuntoVendita(
    id,
    nome,
    codice,
    password,
    tiscaliUsername,
    tiscaliPassword,
    callback
) {

    // Campi che devono essere sempre aggiornati
    const aggiornamenti = {
        nome: nome,
        codice: codice
    };


    // Password account:
    // viene modificata SOLO se è stato inserito
    // un nuovo valore non vuoto
    if (
        password !== undefined &&
        password !== null &&
        String(password).trim() !== ""
    ) {

        aggiornamenti.password =
            String(password).trim();

    }


    // Username Tiscali:
    // se vuoto mantiene quello già presente
    if (
        tiscaliUsername !== undefined &&
        tiscaliUsername !== null &&
        String(tiscaliUsername).trim() !== ""
    ) {

        aggiornamenti.tiscaliUsername =
            String(tiscaliUsername).trim();

    }


    // Password Tiscali:
    // se vuota mantiene quella già presente
    if (
        tiscaliPassword !== undefined &&
        tiscaliPassword !== null &&
        String(tiscaliPassword).trim() !== ""
    ) {

        aggiornamenti.tiscaliPassword =
            String(tiscaliPassword).trim();

    }


    supabase
        .from("punti_vendita")
        .update(aggiornamenti)
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


// =====================================================
// MODIFICA PROPRIO ACCOUNT
// =====================================================

function aggiornaMioAccount(
    id,
    password,
    tiscaliUsername,
    tiscaliPassword,
    callback
) {

    const aggiornamenti = {};


    // Password account
    if (
        password !== undefined &&
        password !== null &&
        String(password).trim() !== ""
    ) {

        aggiornamenti.password =
            String(password).trim();

    }


    // Username Tiscali
    if (
        tiscaliUsername !== undefined &&
        tiscaliUsername !== null &&
        String(tiscaliUsername).trim() !== ""
    ) {

        aggiornamenti.tiscaliUsername =
            String(tiscaliUsername).trim();

    }


    // Password Tiscali
    if (
        tiscaliPassword !== undefined &&
        tiscaliPassword !== null &&
        String(tiscaliPassword).trim() !== ""
    ) {

        aggiornamenti.tiscaliPassword =
            String(tiscaliPassword).trim();

    }


    // Se tutti i campi sono vuoti,
    // non facciamo nessun UPDATE
    if (
        Object.keys(aggiornamenti).length === 0
    ) {

        callback(null);
        return;

    }


    supabase
        .from("punti_vendita")
        .update(aggiornamenti)
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

function verificaLoginAmministratore(
    username,
    password,
    callback
) {

    supabase
        .from("amministratori")
        .select(`
            id,
            username,
            nome,
            attivo
        `)
        .eq("username", username)
        .eq("password", password)
        .eq("attivo", 1)
        .maybeSingle()
        .then(({ data, error }) => {

            if (error) {

                callback(error, null);
                return;

            }

            callback(null, data);

        })
        .catch((err) => {

            callback(err, null);

        });

}


function getAmministratoreById(
    id,
    callback
) {

    supabase
        .from("amministratori")
        .select(`
            id,
            username,
            nome,
            attivo
        `)
        .eq("id", id)
        .maybeSingle()
        .then(({ data, error }) => {

            if (error) {

                callback(error, null);
                return;

            }

            callback(null, data);

        })
        .catch((err) => {

            callback(err, null);

        });

}


// =====================================================
// ULTIMO RESOCONTO INVIO
// =====================================================

function getUltimoResocontoInvio(
    puntoVenditaId,
    callback
) {

    supabase
        .from("resoconti_invii")
        .select("*")
        .eq(
            "punto_vendita_id",
            puntoVenditaId
        )
        .order(
            "creato_il",
            { ascending: false }
        )
        .limit(1)
        .maybeSingle()

        .then(({ data, error }) => {

            if (error) {
                callback(error, null);
                return;
            }

            callback(null, data);

        })

        .catch((err) => {

            callback(err, null);

        });

}

// =====================================================
// EXPORT
// =====================================================

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

    riattivaPuntoVendita,

    verificaLoginAmministratore,

    getAmministratoreById,

    getUltimoResocontoInvio,

        modificaCodiceProdottoOrdine,

};