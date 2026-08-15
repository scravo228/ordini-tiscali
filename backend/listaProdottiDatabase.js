const supabase = require("./database");


// =====================================================
// RECUPERA TUTTA LA LISTA PRODOTTI
// =====================================================

function getListaProdotti(callback) {

    supabase
        .from("lista_prodotti")
        .select(`
            id,
            codice,
            descrizione,
            unita,
            quantita
        `)
        .order("id", {
            ascending: true
        })

        .then(({ data, error }) => {

            if (error) {
                callback(error, null);
                return;
            }

            callback(null, data || []);

        })

        .catch((err) => {

            callback(err, null);

        });

}


// =====================================================
// INSERISCE UN PRODOTTO
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

            codice: codice,
            descrizione: descrizione,
            unita: unita || "",
            quantita: quantita || 0

        })
        .select("id")
        .single()

        .then(({ data, error }) => {

            if (error) {
                callback(error, null);
                return;
            }

            callback(null, data.id);

        })

        .catch((err) => {

            callback(err, null);

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

            codice: nuovoCodice

        })
        .eq("id", id)

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

            codice: codice,
            descrizione: descrizione,
            unita: unita || "",
            quantita: quantita || 0

        })
        .eq("id", id)

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
        .eq("id", id)

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
    inserisciProdotto,
    modificaCodiceProdotto,
    modificaProdotto,
    eliminaProdotto

};