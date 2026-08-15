
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    throw new Error(
        "SUPABASE_URL non configurata nelle variabili d'ambiente"
    );
}

if (!supabaseKey) {
    throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY non configurata nelle variabili d'ambiente"
    );
}

const supabase = createClient(
    supabaseUrl,
    supabaseKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

console.log("ordiniDatabase: Supabase configurato");


// =====================================================
// ORDINI
// =====================================================

async function creaOrdine(
    puntoVenditaId,
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("ordini")
                .insert({
                    puntoVenditaId: puntoVenditaId,
                    stato: "APERTO"
                })
                .select("id")
                .single();

        if (error) {
            callback(error);
            return;
        }

        callback(null, data.id);

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// AGGIUNGI / MODIFICA PRODOTTO ORDINE
// =====================================================

async function aggiungiProdottoOrdine(
    ordineId,
    codice,
    descrizione,
    quantita,
    callback
) {

    try {

        const { data: prodotto, error: erroreRicerca } =
            await supabase
                .from("dettagli_ordine")
                .select("*")
                .eq("ordineId", ordineId)
                .eq("codice", codice)
                .maybeSingle();

        if (erroreRicerca) {
            callback(erroreRicerca);
            return;
        }


        if (prodotto) {

            const { data, error } =
                await supabase
                    .from("dettagli_ordine")
                    .update({
                        quantita: quantita,
                        descrizione: descrizione
                    })
                    .eq("id", prodotto.id)
                    .select("id")
                    .single();

            if (error) {
                callback(error);
                return;
            }

            callback(null, data.id);
            return;
        }


        const { data, error } =
            await supabase
                .from("dettagli_ordine")
                .insert({
                    ordineId: ordineId,
                    codice: codice,
                    descrizione: descrizione,
                    quantita: quantita
                })
                .select("id")
                .single();

        if (error) {
            callback(error);
            return;
        }

        callback(null, data.id);

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// ORDINE APERTO
// =====================================================

async function getOrdineAperto(
    puntoVenditaId,
    callback
) {

    try {

        const { data: ordine, error: erroreOrdine } =
            await supabase
                .from("ordini")
                .select("*")
                .eq("puntoVenditaId", puntoVenditaId)
                .eq("stato", "APERTO")
                .order("id", {
                    ascending: false
                })
                .limit(1)
                .maybeSingle();

        if (erroreOrdine) {
            callback(erroreOrdine);
            return;
        }

        if (!ordine) {
            callback(null, null);
            return;
        }


        const { data: prodotti, error: erroreProdotti } =
            await supabase
                .from("dettagli_ordine")
                .select("codice, descrizione, quantita")
                .eq("ordineId", ordine.id);

        if (erroreProdotti) {
            callback(erroreProdotti);
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
                prodotti || []

        });

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// MODIFICA QUANTITÀ
// =====================================================

async function modificaQuantitaOrdine(
    ordineId,
    codice,
    quantita,
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("dettagli_ordine")
                .update({
                    quantita: quantita
                })
                .eq("ordineId", ordineId)
                .eq("codice", codice)
                .select("id");

        if (error) {
            callback(error);
            return;
        }

        callback(
            null,
            data ? data.length : 0
        );

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// ELIMINA PRODOTTO
// =====================================================

async function eliminaProdottoOrdine(
    ordineId,
    codice,
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("dettagli_ordine")
                .delete()
                .eq("ordineId", ordineId)
                .eq("codice", codice)
                .select("id");

        if (error) {
            callback(error);
            return;
        }

        callback(
            null,
            data ? data.length : 0
        );

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// AZZERA ORDINE DATABASE
// =====================================================

async function azzeraOrdineDatabase(
    ordineId,
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("dettagli_ordine")
                .delete()
                .eq("ordineId", ordineId)
                .select("id");

        if (error) {
            callback(error);
            return;
        }

        callback(
            null,
            data ? data.length : 0
        );

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// AZZERA ORDINE
// =====================================================

async function azzeraOrdine(
    ordineId,
    callback
) {

    try {

        const { error } =
            await supabase
                .from("dettagli_ordine")
                .delete()
                .eq("ordineId", ordineId);

        if (error) {
            callback(error);
            return;
        }

        callback(null);

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// RECUPERA ORDINE
// =====================================================

async function getOrdine(
    ordineId,
    callback
) {

    try {

        const { data: ordine, error: erroreOrdine } =
            await supabase
                .from("ordini")
                .select("*")
                .eq("id", ordineId)
                .maybeSingle();

        if (erroreOrdine) {
            callback(erroreOrdine);
            return;
        }

        if (!ordine) {
            callback(
                new Error("Ordine non trovato")
            );
            return;
        }


        const { data: prodotti, error: erroreProdotti } =
            await supabase
                .from("dettagli_ordine")
                .select("codice, descrizione, quantita")
                .eq("ordineId", ordineId);

        if (erroreProdotti) {
            callback(erroreProdotti);
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
                prodotti || []

        });

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// APRI ORDINE
// =====================================================

async function apriOrdine(
    puntoVenditaId,
    callback
) {

    try {

        const { data: ordine, error: erroreRicerca } =
            await supabase
                .from("ordini")
                .select("id")
                .eq("puntoVenditaId", puntoVenditaId)
                .eq("stato", "APERTO")
                .order("id", {
                    ascending: false
                })
                .limit(1)
                .maybeSingle();

        if (erroreRicerca) {
            callback(erroreRicerca);
            return;
        }


        if (ordine) {

            callback(null, ordine.id);
            return;

        }


        const { data, error } =
            await supabase
                .from("ordini")
                .insert({
                    puntoVenditaId:
                        puntoVenditaId,

                    stato:
                        "APERTO"
                })
                .select("id")
                .single();

        if (error) {
            callback(error);
            return;
        }

        callback(null, data.id);

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// RECUPERA ORDINE PER ID
// =====================================================

async function getOrdineById(
    ordineId,
    callback
) {

    try {

        const { data: ordine, error: erroreOrdine } =
            await supabase
                .from("ordini")
                .select("*")
                .eq("id", ordineId)
                .maybeSingle();

        if (erroreOrdine) {
            callback(erroreOrdine);
            return;
        }

        if (!ordine) {

            callback(
                new Error("Ordine non trovato")
            );

            return;
        }


        const { data: prodotti, error: erroreProdotti } =
            await supabase
                .from("dettagli_ordine")
                .select(
                    "codice, descrizione, quantita"
                )
                .eq("ordineId", ordineId);


        if (erroreProdotti) {
            callback(erroreProdotti);
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
                prodotti || []

        });

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// CHIUDI ORDINE
// =====================================================

async function chiudiOrdine(
    ordineId,
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("ordini")
                .update({
                    stato: "INVIATO"
                })
                .eq("id", ordineId)
                .select("id");

        if (error) {
            callback(error);
            return;
        }

        callback(
            null,
            data ? data.length : 0
        );

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// PUNTO VENDITA
// =====================================================

async function creaPuntoVendita(
    nome,
    codice,
    password,
    tiscaliUsername,
    tiscaliPassword,
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("punti_vendita")
                .insert({

                    nome:
                        nome,

                    codice:
                        codice,

                    password:
                        password,

                    ruolo:
                        "negozio",

                    tiscaliUsername:
                        tiscaliUsername || "",

                    tiscaliPassword:
                        tiscaliPassword || "",

                    attivo:
                        1

                })
                .select("id")
                .single();

        if (error) {

            console.error(
                "Errore creazione punto vendita:",
                error
            );

            if (callback) {
                callback(error);
            }

            return;
        }


        console.log(
            "Punto vendita creato ID:",
            data.id
        );


        if (callback) {
            callback(null, data.id);
        }

    } catch (errore) {

        console.error(
            "Errore creazione punto vendita:",
            errore
        );

        if (callback) {
            callback(errore);
        }

    }

}


// =====================================================
// LOGIN PUNTO VENDITA
// =====================================================

async function verificaLogin(
    codice,
    password,
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("punti_vendita")
                .select("*")
                .eq("codice", codice)
                .eq("password", password)
                .eq("attivo", 1)
                .neq("ruolo", "amministratore")
                .maybeSingle();

        if (error) {

            callback(error, null);
            return;

        }

        callback(null, data || null);

    } catch (errore) {

        callback(errore, null);

    }

}


// =====================================================
// LOGIN AMMINISTRATORE
// =====================================================

async function verificaLoginAmministratore(
    codice,
    password,
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("punti_vendita")
                .select("*")
                .eq("codice", codice)
                .eq("password", password)
                .eq("attivo", 1)
                .eq("ruolo", "amministratore")
                .maybeSingle();

        if (error) {

            callback(error, null);
            return;

        }

        callback(null, data || null);

    } catch (errore) {

        callback(errore, null);

    }

}


// =====================================================
// CREA AMMINISTRATORE
// =====================================================

async function creaAmministratore(
    codice,
    password,
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("punti_vendita")
                .insert({

                    nome:
                        "Amministratore",

                    codice:
                        codice,

                    password:
                        password,

                    ruolo:
                        "amministratore",

                    attivo:
                        1

                })
                .select("id")
                .single();

        if (error) {

            console.error(
                "Errore creazione amministratore:",
                error
            );

            callback(error);
            return;

        }


        console.log(
            "Amministratore creato con ID:",
            data.id
        );


        callback(
            null,
            data.id
        );

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// RECUPERA PUNTO VENDITA
// =====================================================

async function getPuntoVenditaById(
    id,
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("punti_vendita")
                .select("*")
                .eq("id", id)
                .maybeSingle();

        if (error) {

            callback(error, null);
            return;

        }

        callback(
            null,
            data || null
        );

    } catch (errore) {

        callback(
            errore,
            null
        );

    }

}


// =====================================================
// RECUPERA TUTTI I PUNTI VENDITA
// =====================================================

async function getTuttiPuntiVendita(
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("punti_vendita")
                .select(
                    "id, nome, codice, ruolo, attivo"
                )
                .order("nome", {
                    ascending: true
                });

        if (error) {

            callback(error, null);
            return;

        }

        callback(
            null,
            data || []
        );

    } catch (errore) {

        callback(
            errore,
            null
        );

    }

}


// =====================================================
// DISATTIVA PUNTO VENDITA
// =====================================================

async function disattivaPuntoVendita(
    id,
    callback
) {

    try {

        const { error } =
            await supabase
                .from("punti_vendita")
                .update({
                    attivo: 0
                })
                .eq("id", id);

        if (error) {

            callback(error);
            return;

        }

        callback(null);

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// RIATTIVA PUNTO VENDITA
// =====================================================

async function riattivaPuntoVendita(
    id,
    callback
) {

    try {

        const { error } =
            await supabase
                .from("punti_vendita")
                .update({
                    attivo: 1
                })
                .eq("id", id);

        if (error) {

            callback(error);
            return;

        }

        callback(null);

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// MODIFICA PUNTO VENDITA ADMIN
// =====================================================

async function modificaPuntoVendita(
    id,
    nome,
    codice,
    password,
    tiscaliUsername,
    tiscaliPassword,
    callback
) {

    try {

        const dati = {

            nome:
                nome,

            codice:
                codice,

            tiscaliUsername:
                tiscaliUsername || "",

            tiscaliPassword:
                tiscaliPassword || ""

        };


        // La password viene modificata
        // SOLO se ne viene inserita una nuova

        if (
            password !== undefined &&
            password !== null &&
            String(password).trim() !== ""
        ) {

            dati.password =
                String(password).trim();

        }


        const { error } =
            await supabase
                .from("punti_vendita")
                .update(dati)
                .eq("id", id);


        if (error) {

            callback(error);
            return;

        }

        callback(null);

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// MODIFICA PROPRIO ACCOUNT
// =====================================================

async function aggiornaMioAccount(
    id,
    password,
    tiscaliUsername,
    tiscaliPassword,
    callback
) {

    try {

        const dati = {

            tiscaliUsername:
                tiscaliUsername || "",

            tiscaliPassword:
                tiscaliPassword || ""

        };


        // La password viene modificata
        // SOLO se ne viene inserita una nuova

        if (
            password !== undefined &&
            password !== null &&
            String(password).trim() !== ""
        ) {

            dati.password =
                String(password).trim();

        }


        const { error } =
            await supabase
                .from("punti_vendita")
                .update(dati)
                .eq("id", id);


        if (error) {

            callback(error);
            return;

        }

        callback(null);

    } catch (errore) {

        callback(errore);

    }

}


// =====================================================
// RECUPERA AMMINISTRATORE
// =====================================================

async function getAmministratoreById(
    id,
    callback
) {

    try {

        const { data, error } =
            await supabase
                .from("punti_vendita")
                .select("*")
                .eq("id", id)
                .eq("ruolo", "amministratore")
                .maybeSingle();

        if (error) {

            callback(error, null);
            return;

        }

        callback(
            null,
            data || null
        );

    } catch (errore) {

        callback(
            errore,
            null
        );

    }

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

    verificaLoginAmministratore,

    creaAmministratore,

    getAmministratoreById,

    getPuntoVenditaById,

    getTuttiPuntiVendita,

    disattivaPuntoVendita,

    modificaPuntoVendita,

    aggiornaMioAccount,

    riattivaPuntoVendita

};

