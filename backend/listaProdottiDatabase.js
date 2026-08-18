const supabase = require("./database");


// =====================================================
// RECUPERA TUTTA LA LISTA PRODOTTI
// =====================================================
//
// lista_prodotti è il catalogo condiviso.
// La quantità dell'ordine NON deve stare qui.
// Per compatibilità con il frontend restituiamo sempre quantita: 0.
// =====================================================

function getListaProdotti(callback) {

    supabase
        .from("lista_prodotti")
        .select(`
            id,
            codice,
            descrizione,
            unita
        `)
        .order("id", {
            ascending: true
        })
        .then(({ data, error }) => {

            if (error) {

                callback(
                    error,
                    null
                );

                return;

            }


            const prodotti =
                (data || []).map(
                    prodotto => ({

                        ...prodotto,

                        // IMPORTANTE:
                        // la lista globale deve partire sempre vuota
                        quantita: 0

                    })
                );


            callback(
                null,
                prodotti
            );

        })
        .catch((err) => {

            callback(
                err,
                null
            );

        });

}


// =====================================================
// SOSTITUISCE TUTTA LA LISTA PRODOTTI
// =====================================================
//
// Anche se l'Excel contiene QUANTITA',
// nel catalogo condiviso salviamo sempre 0.
// =====================================================

async function sostituisciListaProdotti(
    prodotti,
    callback
) {

    try {

        const {
            error: erroreEliminazione
        } =
            await supabase
                .from("lista_prodotti")
                .delete()
                .neq("id", 0);


        if (erroreEliminazione) {

            callback(
                erroreEliminazione
            );

            return;

        }


        if (
            !prodotti ||
            prodotti.length === 0
        ) {

            callback(null);

            return;

        }


        const prodottiUnici = new Map();

for (const prodotto of prodotti) {

    const codice =
        String(
            prodotto.codice || ""
        )
        .trim()
        .toUpperCase();

    if (!codice) {
        continue;
    }

    if (!prodottiUnici.has(codice)) {

        prodottiUnici.set(
            codice,
            {

                codice,

                descrizione:
                    String(
                        prodotto.descrizione || ""
                    ).trim(),

                unita:
                    String(
                        prodotto.unita || ""
                    ).trim(),

                quantita: 0

            }
        );

    }

}

const righe =
    Array.from(
        prodottiUnici.values()
    );


        const {
            error
        } =
            await supabase
                .from("lista_prodotti")
                .insert(righe);


        if (error) {

            callback(error);

            return;

        }


        callback(null);

    } catch (err) {

        callback(err);

    }

}


// =====================================================
// INSERISCE UN PRODOTTO
// =====================================================
//
// Manteniamo quantita nella firma della funzione
// solo per non rompere eventuali chiamate esistenti.
// Nel database salviamo comunque sempre 0.
// =====================================================

function inserisciProdotto(
    codice,
    descrizione,
    unita,
    quantita,
    callback
) {

    supabase
        .from("lista_prodotti")
        .insert({

            codice:
                codice,

            descrizione:
                descrizione,

            unita:
                unita || "",

            // La quantità non appartiene al catalogo globale
            quantita: 0

        })
        .select("id")
        .single()

        .then(({ data, error }) => {

            if (error) {

                callback(
                    error,
                    null
                );

                return;

            }


            callback(
                null,
                data.id
            );

        })

        .catch((err) => {

            callback(
                err,
                null
            );

        });

}


// =====================================================
// MODIFICA CODICE PRODOTTO
// =====================================================

function modificaCodiceProdotto(
    id,
    nuovoCodice,
    callback
) {

    supabase
        .from("lista_prodotti")
        .update({

            codice:
                nuovoCodice

        })
        .eq(
            "id",
            id
        )

        .then(({ error }) => {

            if (error) {

                callback(error);

                return;

            }


            callback(null);

        })

        .catch((err) => {

            callback(err);

        });

}


// =====================================================
// MODIFICA PRODOTTO COMPLETO
// =====================================================
//
// Anche qui la quantità non viene più modificata.
// =====================================================

function modificaProdotto(
    id,
    codice,
    descrizione,
    unita,
    quantita,
    callback
) {

    supabase
        .from("lista_prodotti")
        .update({

            codice:
                codice,

            descrizione:
                descrizione,

            unita:
                unita || ""

        })
        .eq(
            "id",
            id
        )

        .then(({ error }) => {

            if (error) {

                callback(error);

                return;

            }


            callback(null);

        })

        .catch((err) => {

            callback(err);

        });

}


// =====================================================
// ELIMINA PRODOTTO
// =====================================================

function eliminaProdotto(
    id,
    callback
) {

    supabase
        .from("lista_prodotti")
        .delete()
        .eq(
            "id",
            id
        )

        .then(({ error }) => {

            if (error) {

                callback(error);

                return;

            }


            callback(null);

        })

        .catch((err) => {

            callback(err);

        });

}


// =====================================================
// ESPORTAZIONE
// =====================================================

module.exports = {

    getListaProdotti,

    sostituisciListaProdotti,

    inserisciProdotto,

    modificaCodiceProdotto,

    modificaProdotto,

    eliminaProdotto

};