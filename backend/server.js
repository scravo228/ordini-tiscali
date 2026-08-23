// =====================================================
// AVVIO SERVER
// =====================================================
require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

const tiscali = require("./tiscali");
const ordiniDatabase = require("./ordiniDatabase");

const puntiVendita = require("./puntiVendita");
const prodotti = require("./prodotti");
const listaProdotti = require("./listaProdottiDatabase");
const listaPuntiVendita = require("./listaPuntiVendita");
const ordineCorrente = require("./ordineCorrente");
const ordini = require("./ordini");

const app = express();

const PORT = process.env.PORT || 3000;





// =====================================================
// AUTO-PING RENDER
// =====================================================

if (process.env.NODE_ENV === "production") {

    const autoPingUrl =
        "https://ordini-tiscali.onrender.com/";

    setInterval(async () => {

        try {

            const risposta =
                await fetch(autoPingUrl);

            console.log(
                "AUTO-PING RENDER:",
                risposta.status
            );

        } catch (errore) {

            console.log(
                "ERRORE AUTO-PING:",
                errore.message
            );

        }

    }, 10 * 60 * 1000);

}


// =====================================================
// CONFIGURAZIONE
// =====================================================

const upload = multer({
    dest: "uploads/"
});

app.use(cors());

app.use(express.json());


// =====================================================
// ADMIN - RIPRISTINA ADMIN
// =====================================================

app.post("/admin/ripristina-admin", (req, res) => {

    ordiniDatabase.verificaLogin(
        "ADMIN",
        "1234",
        (err, amministratore) => {

            if (err) {

                return res.status(500).json({
                    successo: false,
                    fase: "controllo",
                    errore: err.message
                });

            }

            if (amministratore) {

                return res.json({
                    successo: true,
                    messaggio: "Account ADMIN già presente",
                    amministratoreId:
                        amministratore.id
                });

            }

            ordiniDatabase.creaAmministratore(
                "ADMIN",
                "1234",
                (err, id) => {

                    if (err) {

                        return res.status(500).json({
                            successo: false,
                            fase: "creazione",
                            errore: err.message
                        });

                    }

                    return res.json({
                        successo: true,
                        messaggio: "Account ADMIN creato",
                        amministratoreId: id
                    });

                }
            );

        }
    );

});


// =====================================================
// BASE
// =====================================================

app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../frontend/index.html"
        )
    );

});


// =====================================================
// DATI APP
// =====================================================

app.get("/punti-vendita", (req, res) => {

    res.json(puntiVendita);

});


app.get("/prodotti", (req, res) => {

    listaProdotti.getListaProdotti((errore, prodottiOnline) => {

        if (errore) {

            console.error(
                "Errore recupero lista prodotti:",
                errore
            );

            return res.status(500).json({
                successo: false,
                errore: "Errore recupero lista prodotti"
            });

        }

        res.json({
            successo: true,
            prodotti: prodottiOnline
        });

    });

});

// =====================================================
// MODIFICA CODICE PRODOTTO
// =====================================================

// =====================================================
// MODIFICA CODICE PRODOTTO
// CATALOGO + EVENTUALE ORDINE APERTO
// =====================================================

app.post(
    "/prodotti/modifica-codice",
    (req, res) => {

        const {
            id,
            nuovoCodice,
            codicePrecedente,
            ordineId
        } = req.body;


        if (
            !id ||
            !nuovoCodice
        ) {

            return res.status(400).json({

                successo: false,

                errore:
                    "ID prodotto o nuovo codice mancanti"

            });

        }


        // =============================================
        // 1. AGGIORNA IL CATALOGO GLOBALE
        // =============================================

        listaProdotti.modificaCodiceProdotto(
            id,
            nuovoCodice,
            (errore) => {

                if (errore) {

                    console.error(
                        "Errore modifica codice prodotto:",
                        errore
                    );

                    return res.status(500).json({

                        successo: false,

                        fase:
                            "lista_prodotti",

                        errore:
                            errore.message

                    });

                }


                // =============================================
                // Se non c'è un ordine aperto,
                // il lavoro è già finito.
                // =============================================

                if (
                    !ordineId ||
                    !codicePrecedente
                ) {

                    return res.json({

                        successo: true,

                        ordineAggiornato:
                            false,

                        messaggio:
                            "Codice prodotto aggiornato"

                    });

                }


                // =============================================
                // 2. AGGIORNA ANCHE DETTAGLI_ORDINE
                // =============================================

                ordiniDatabase.modificaCodiceProdottoOrdine(
                    ordineId,
                    codicePrecedente,
                    nuovoCodice,
                    (erroreOrdine, risultatoOrdine) => {

                        if (erroreOrdine) {

                            console.error(
                                "Errore modifica codice ordine:",
                                erroreOrdine
                            );

                            return res.status(500).json({

                                successo: false,

                                fase:
                                    "dettagli_ordine",

                                errore:
                                    erroreOrdine.message

                            });

                        }


                        return res.json({

    successo: true,

    ordineAggiornato:
        risultatoOrdine?.modificati > 0,

    dettaglioOrdine:
        risultatoOrdine,

    messaggio:
        risultatoOrdine?.modificati > 0
            ? "Codice prodotto aggiornato anche nell'ordine"
            : "Codice lista aggiornato, ma prodotto non trovato nell'ordine"

});

                    }
                );

            }
        );

    }
);


app.get("/lista-punto-vendita", (req, res) => {

    res.json(listaPuntiVendita);

});


app.get("/ordine", (req, res) => {

    res.json(ordineCorrente);

});


// =====================================================
// GESTIONE ORDINE LOCALE
// =====================================================

app.post("/ordine/aggiungi", (req, res) => {

    try {

        const {
            codice,
            quantita
        } = req.body;

        if (
            !codice ||
            Number(quantita) <= 0
        ) {

            return res.status(400).json({
                successo: false,
                errore:
                    "Codice o quantità non validi"
            });

        }

        const ordine =
            ordini.aggiungiProdotto(
                codice,
                Number(quantita)
            );

        res.json({
            successo: true,
            ordine
        });

    } catch (errore) {

        console.error(
            "ERRORE AGGIUNTA ORDINE:",
            errore
        );

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});


app.post("/ordine/modifica", (req, res) => {

    try {

        const {
            codice,
            quantita
        } = req.body;

        if (
            !codice ||
            Number(quantita) < 0
        ) {

            return res.status(400).json({
                successo: false,
                errore:
                    "Codice o quantità non validi"
            });

        }

        const ordine =
            ordini.modificaQuantita(
                codice,
                Number(quantita)
            );

        res.json({
            successo: true,
            ordine
        });

    } catch (errore) {

        console.error(
            "ERRORE MODIFICA ORDINE:",
            errore
        );

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});


app.post("/ordine/elimina-prodotto", (req, res) => {

    try {

        const {
            codice
        } = req.body;

        if (!codice) {

            return res.status(400).json({
                successo: false,
                errore:
                    "Codice prodotto mancante"
            });

        }

        const ordine =
            ordini.eliminaProdotto(codice);

        res.json({
            successo: true,
            ordine
        });

    } catch (errore) {

        console.error(
            "ERRORE ELIMINAZIONE PRODOTTO:",
            errore
        );

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});


app.post("/ordine/azzera", (req, res) => {

    try {

        const ordine =
            ordini.azzeraOrdine();

        res.json({
            successo: true,
            ordine
        });

    } catch (errore) {

        console.error(
            "ERRORE AZZERAMENTO ORDINE:",
            errore
        );

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});


// =====================================================
// ULTIMO RESOCONTO INVIO TISCALI PER PUNTO VENDITA
// =====================================================

app.get(
    "/ordine/ultimo-resoconto/:puntoVenditaId",
    (req, res) => {

        const puntoVenditaId =
            Number(req.params.puntoVenditaId);

        if (!puntoVenditaId) {

            return res.status(400).json({
                successo: false,
                errore: "Punto vendita mancante o non valido"
            });

        }

        ordiniDatabase.getUltimoResocontoInvio(
            puntoVenditaId,
            (errore, resoconto) => {

                if (errore) {

                    console.error(
                        "ERRORE RECUPERO ULTIMO RESOCONTO:",
                        errore
                    );

                    return res.status(500).json({
                        successo: false,
                        errore: errore.message
                    });

                }

                return res.json({
                    successo: true,
                    resoconto: resoconto || null
                });

            }
        );

    }
);


// =====================================================
// DATABASE ORDINI
// =====================================================

app.post("/ordine/apri", (req, res) => {

    const {
        puntoVenditaId
    } = req.body;

    if (!puntoVenditaId) {

        return res.status(400).json({
            successo: false,
            errore:
                "Punto vendita mancante"
        });

    }

    ordiniDatabase.apriOrdine(
        puntoVenditaId,
        (err, idOrdine) => {

            if (err) {

                return res.status(500).json({
                    successo: false,
                    errore: err.message
                });

            }

            res.json({
                successo: true,
                ordineId: idOrdine
            });

        }
    );

});


app.get("/ordine/:puntoVenditaId", (req, res) => {

    const id =
        req.params.puntoVenditaId;

    ordiniDatabase.getOrdineAperto(
        id,
        (err, ordine) => {

            if (err) {

                return res.status(500).json({
                    successo: false,
                    errore: err.message
                });

            }

            res.json(ordine);

        }
    );

});


app.post("/ordine/prodotto", (req, res) => {

    const {
        ordineId,
        codice,
        descrizione,
        quantita
    } = req.body;

    if (
        !ordineId ||
        !codice ||
        Number(quantita) <= 0
    ) {

        return res.status(400).json({
            successo: false,
            errore:
                "Dati prodotto non validi"
        });

    }

    ordiniDatabase.aggiungiProdottoOrdine(
        ordineId,
        codice,
        descrizione,
        Number(quantita),
        (err, risultato) => {

            if (err) {

                return res.status(500).json({
                    successo: false,
                    errore: err.message
                });

            }

            res.json({
                successo: true,
                aggiunto: risultato
            });

        }
    );

});


app.post("/ordine/prodotto/modifica", (req, res) => {

    const {
        ordineId,
        codice,
        quantita
    } = req.body;

    if (
        !ordineId ||
        !codice ||
        Number(quantita) < 0
    ) {

        return res.status(400).json({
            successo: false,
            errore:
                "Dati modifica non validi"
        });

    }

    ordiniDatabase.modificaQuantitaOrdine(
        ordineId,
        codice,
        Number(quantita),
        (err, risultato) => {

            if (err) {

                return res.status(500).json({
                    successo: false,
                    errore: err.message
                });

            }

            res.json({
                successo: true,
                modificati: risultato
            });

        }
    );

});


app.post("/ordine/prodotto/elimina", (req, res) => {

    const {
        ordineId,
        codice
    } = req.body;

    if (
        !ordineId ||
        !codice
    ) {

        return res.status(400).json({
            successo: false,
            errore:
                "Ordine o codice mancanti"
        });

    }

    ordiniDatabase.eliminaProdottoOrdine(
        ordineId,
        codice,
        (err, risultato) => {

            if (err) {

                return res.status(500).json({
                    successo: false,
                    errore: err.message
                });

            }

            res.json({
                successo: true,
                eliminati: risultato
            });

        }
    );

});


app.post("/ordine/database/azzera", (req, res) => {

    const {
        ordineId
    } = req.body;

    if (!ordineId) {

        return res.status(400).json({
            successo: false,
            errore:
                "ID ordine mancante"
        });

    }

    ordiniDatabase.azzeraOrdine(
        ordineId,
        (err) => {

            if (err) {

                return res.status(500).json({
                    successo: false,
                    errore: err.message
                });

            }

            res.json({
                successo: true,
                messaggio:
                    "Ordine azzerato"
            });

        }
    );

});


app.get("/ordine/riepilogo/:id", (req, res) => {

    const ordineId =
        req.params.id;

    ordiniDatabase.getOrdine(
        ordineId,
        (err, ordine) => {

            if (err) {

                return res.status(500).json({
                    successo: false,
                    errore: err.message
                });

            }

            res.json(ordine);

        }
    );

});


// =====================================================
// CARICAMENTO EXCEL
// =====================================================

app.post(
    "/upload-excel",
    upload.single("file"),
    (req, res) => {

        console.log(
            "RICEVUTO UPLOAD EXCEL"
        );

        console.log(
            "FILE RICEVUTO:",
            req.file
        );

        try {

            if (!req.file) {

                return res.status(400).json({
                    successo: false,
                    errore:
                        "Nessun file ricevuto"
                });

            }

            const filePath =
                req.file.path;

            const workbook =
                XLSX.readFile(filePath);

            console.log(
                "LETTO EXCEL OK"
            );

            const sheetName =
                workbook.SheetNames[0];

            const sheet =
                workbook.Sheets[sheetName];

            const righe =
                XLSX.utils.sheet_to_json(
                    sheet,
                    {
                        defval: ""
                    }
                );

            const dati =
                righe
                    .map(riga => {

                        const valori =
                            Object.values(riga);

                        return {

                            codice:
                                String(
                                    valori[0] || ""
                                ).trim(),

                            descrizione:
                                String(
                                    valori[1] || ""
                                ).trim(),

                            unita:
                                String(
                                    valori[2] || ""
                                ).trim(),

                            quantita:
                                Number(
                                    valori[3]
                                ) || 0

                        };

                    })
                    .filter(prodotto => {

                        return (
                            prodotto.codice &&
                            prodotto.descrizione &&
                            prodotto.codice !== "COD. ART" &&
                            prodotto.descrizione !== "DESCRIZIONE"
                        );

                    });

            console.log(
    "PRODOTTI CREATI:",
    dati.length
);

console.log(
    "SALVATAGGIO LISTA IN SUPABASE..."
);

listaProdotti.sostituisciListaProdotti(
    dati,
    (erroreSalvataggio) => {

        if (erroreSalvataggio) {

            console.error(
                "ERRORE SALVATAGGIO LISTA SUPABASE:",
                erroreSalvataggio
            );

            return res.status(500).json({

                successo: false,

                errore:
                    "Errore salvataggio lista prodotti",

                dettaglio:
                    erroreSalvataggio.message

            });

        }

        console.log(
            "LISTA SALVATA IN SUPABASE:",
            dati.length
        );

        console.log(
            "INVIO PRODOTTI AL TELEFONO:",
            dati.length
        );

        return res.json({

            successo: true,

            prodotti: dati

        });

    }
);

        } catch (errore) {

            console.error(
                "ERRORE CARICAMENTO EXCEL:",
                errore
            );

            res.status(500).json({

                successo: false,

                errore:
                    errore.message

            });

        }

    }
);


// =====================================================
// RICERCA PRODOTTI EXCEL SU TISCALI
// =====================================================

app.post(
    "/cerca-prodotti-excel",
    async (req, res) => {

        try {

            const prodottiExcel =
                req.body.prodotti || [];

            if (
                !Array.isArray(prodottiExcel) ||
                prodottiExcel.length === 0
            ) {

                return res.status(400).json({

                    successo: false,

                    errore:
                        "Nessun prodotto ricevuto"

                });

            }

            const risultati = [];

            for (const prodotto of prodottiExcel) {

                const codice =
                    String(
                        prodotto.codice || ""
                    ).trim();

                if (!codice) {
                    continue;
                }

                const risultato =
                    await tiscali.cercaProdottoTiscali(
                        codice
                    );

                risultati.push({

                    codice,

                    descrizione:
                        prodotto.descrizione || "",

                    unita:
                        prodotto.unita || "",

                    quantita:
                        Number(
                            prodotto.quantita
                        ) || 0,

                    trovato:
                        risultato.prodottoTrovato ||
                        false,

                    productId:
                        risultato.productId ||
                        null

                });

            }

            res.json({

                successo: true,

                numeroProdotti:
                    risultati.length,

                risultati

            });

        } catch (errore) {

            console.error(
                "ERRORE RICERCA PRODOTTI:",
                errore
            );

            res.status(500).json({

                successo: false,

                errore:
                    errore.message

            });

        }

    }
);


// =====================================================
// SIMULAZIONE ORDINE
// NON MODIFICA IL CARRELLO TISCALI
// =====================================================

app.post(
    "/simula-ordine-excel",
    async (req, res) => {

        try {

            const prodottiExcel =
                req.body.prodotti || [];

            if (
                !Array.isArray(prodottiExcel) ||
                prodottiExcel.length === 0
            ) {

                return res.status(400).json({

                    successo: false,

                    errore:
                        "Nessun prodotto ricevuto"

                });

            }

            const risultati = [];

            for (const prodotto of prodottiExcel) {

                const codice =
                    String(
                        prodotto.codice || ""
                    ).trim();

                const descrizione =
                    String(
                        prodotto.descrizione || ""
                    ).trim();

                const unita =
                    String(
                        prodotto.unita || ""
                    ).trim();

                const quantita =
                    Number(
                        prodotto.quantita
                    ) || 0;

                if (
                    !codice ||
                    quantita <= 0
                ) {
                    continue;
                }

                const ricerca =
                    await tiscali.cercaProdottoTiscali(
                        codice
                    );

                risultati.push({

                    codice,

                    descrizione,

                    unita,

                    quantita,

                    trovato:
                        ricerca.prodottoTrovato ||
                        false,

                    productId:
                        ricerca.productId ||
                        null,

                    simulato: true,

                    carrelloModificato: false

                });

            }

            const trovati =
                risultati.filter(
                    prodotto =>
                        prodotto.trovato
                );

            const nonTrovati =
                risultati.filter(
                    prodotto =>
                        !prodotto.trovato
                );

            res.json({

                successo: true,

                modalitaTest: true,

                carrelloModificato: false,

                numeroProdotti:
                    risultati.length,

                prodottiTrovati:
                    trovati.length,

                prodottiNonTrovati:
                    nonTrovati.length,

                risultati

            });

        } catch (errore) {

            console.error(
                "ERRORE SIMULAZIONE ORDINE:",
                errore
            );

            res.status(500).json({

                successo: false,

                errore:
                    errore.message

            });

        }

    }
);


// =====================================================
// INVIO ORDINE REALE DIRETTO A TISCALI
// =====================================================

app.post(
    "/ordine-tiscali",
    async (req, res) => {

        try {

            const prodottiExcel =
                req.body.prodotti || [];

            if (
                !Array.isArray(prodottiExcel) ||
                prodottiExcel.length === 0
            ) {

                return res.status(400).json({

                    successo: false,

                    errore:
                        "Nessun prodotto ricevuto"

                });

            }

            console.log(
                "================================="
            );

            console.log(
                "ORDINE REALE → TISCALI"
            );

            console.log(
                "PRODOTTI:",
                prodottiExcel.length
            );

            console.log(
                "================================="
            );


            // -------------------------------------------------
            // 1. LOGIN
            // -------------------------------------------------

            const login =
                await tiscali.loginTiscali(
                    process.env.TISCALI_USERNAME,
                    process.env.TISCALI_PASSWORD
                );

            if (!login.successo) {

                return res.status(500).json({

                    successo: false,

                    fase: "login",

                    login

                });

            }


            // -------------------------------------------------
            // 2. PREPARA PRODOTTI
            // -------------------------------------------------

            const prodottiDaInviare =
                prodottiExcel.filter(
                    prodotto => {

                        const codice =
                            String(
                                prodotto.codice || ""
                            ).trim();

                        const quantita =
                            Number(
                                prodotto.quantita || 0
                            );

                        return (
                            codice &&
                            quantita > 0
                        );

                    }
                );


            const risultati = [];


            // -------------------------------------------------
            // 3. CERCA E AGGIUNGE
            // -------------------------------------------------

            for (
                const prodotto
                of prodottiDaInviare
            ) {

                const codice =
                    String(
                        prodotto.codice || ""
                    ).trim();

                const descrizione =
                    String(
                        prodotto.descrizione || ""
                    ).trim();

                const quantita =
                    Number(
                        prodotto.quantita || 0
                    );


                console.log(
                    "---------------------------------"
                );

                console.log(
                    "CODICE:",
                    codice
                );

                console.log(
                    "QUANTITÀ:",
                    quantita
                );


                const ricerca =
                    await tiscali.cercaProdottoTiscali(
                        codice
                    );


                if (
                    !ricerca.successo ||
                    !ricerca.productId
                ) {

                    risultati.push({

                        codice,

                        descrizione,

                        quantita,

                        trovato: false,

                        aggiunto: false,

                        productId: null,

                        errore:
                            ricerca.errore ||
                            "Prodotto non trovato"

                    });

                    continue;

                }


                const productId =
                    ricerca.productId;


                const aggiunta =
                    await tiscali.aggiungiAlCarrelloTiscali(
                        productId,
                        quantita
                    );


                risultati.push({

                    codice,

                    descrizione,

                    quantita,

                    trovato: true,

                    aggiunto:
                        aggiunta.successo === true,

                    productId:
                        String(productId),

                    errore:
                        aggiunta.successo
                            ? null
                            : (
                                aggiunta.errore ||
                                "Errore durante l'aggiunta"
                            )

                });

            }


            // -------------------------------------------------
            // 4. RIEPILOGO
            // -------------------------------------------------

            const aggiunti =
                risultati.filter(
                    prodotto =>
                        prodotto.aggiunto
                );

            const errori =
                risultati.filter(
                    prodotto =>
                        !prodotto.aggiunto
                );


            console.log(
                "================================="
            );

            console.log(
                "FINE ORDINE TISCALI"
            );

            console.log(
                "AGGIUNTI:",
                aggiunti.length
            );

            console.log(
                "ERRORI:",
                errori.length
            );

            console.log(
                "================================="
            );


            return res.json({

                successo:
                    errori.length === 0,

                numeroProdotti:
                    risultati.length,

                prodottiAggiunti:
                    aggiunti.length,

                prodottiConErrore:
                    errori.length,

                risultati

            });

        } catch (errore) {

            console.error(
                "ERRORE ORDINE TISCALI:",
                errore
            );

            return res.status(500).json({

                successo: false,

                errore:
                    errore.message

            });

        }

    }
);


// =====================================================
// SVUOTA CARRELLO TISCALI
// =====================================================

app.post(
    "/svuota-carrello-tiscali",
    async (req, res) => {

        try {

            console.log(
                "================================="
            );

            console.log(
                "RICHIESTA SVUOTAMENTO CARRELLO"
            );

            console.log(
                "================================="
            );


            const test =
                await tiscali.leggiCarrelloTiscali();

            console.log(
                "CONTROLLO PRIMA SVUOTAMENTO:",
                test
            );


            const risultato =
                await tiscali.svuotaCarrelloTiscali();


            console.log(
                "RISULTATO SVUOTAMENTO:"
            );

            console.dir(
                risultato,
                {
                    depth: null
                }
            );


            return res.json(
                risultato
            );

        } catch (errore) {

            console.error(
                "ERRORE ENDPOINT SVUOTA CARRELLO:",
                errore
            );

            return res.status(500).json({

                successo: false,

                carrelloVuoto: false,

                errore:
                    errore.message

            });

        }

    }
);


// =====================================================
// GESTIONE CARRELLO TISCALI
// =====================================================

app.get(
    "/leggi-carrello-tiscali",
    async (req, res) => {

        try {

            const login =
                await tiscali.loginTiscali(
                    process.env.TISCALI_USERNAME,
                    process.env.TISCALI_PASSWORD
                );

            if (!login.successo) {

                return res.status(500).json({

                    successo: false,

                    fase: "login",

                    login

                });

            }


            const carrello =
                await tiscali.leggiCarrelloTiscali();


            return res.json({

                successo: true,

                carrello

            });

        } catch (errore) {

            console.error(
                "ERRORE LETTURA CARRELLO:",
                errore
            );

            return res.status(500).json({

                successo: false,

                errore:
                    errore.message

            });

        }

    }
);


app.post(
    "/carrello/rimuovi",
    async (req, res) => {

        try {

            const {
                productId
            } = req.body;

            if (!productId) {

                return res.status(400).json({

                    successo: false,

                    errore:
                        "Product ID mancante"

                });

            }

            const risultato =
                await tiscali.rimuoviProdottoCarrelloTiscali(
                    productId
                );

            return res.json(
                risultato
            );

        } catch (errore) {

            console.error(
                "ERRORE RIMOZIONE CARRELLO:",
                errore
            );

            return res.status(500).json({

                successo: false,

                errore:
                    errore.message

            });

        }

    }
);


// =====================================================
// TEST LOGIN TISCALI PER PUNTO VENDITA
// =====================================================

app.post(
    "/ordine/test-login-tiscali",
    async (req, res) => {

        try {

            const {
                puntoVenditaId
            } = req.body;

            if (!puntoVenditaId) {

                return res.status(400).json({
                    successo: false,
                    errore:
                        "puntoVenditaId mancante"
                });

            }


            const puntoVendita =
                await new Promise(
                    (resolve, reject) => {

                        ordiniDatabase.getPuntoVenditaById(
                            puntoVenditaId,
                            (err, punto) => {

                                if (err) {
                                    reject(err);
                                    return;
                                }

                                resolve(punto);

                            }
                        );

                    }
                );


            if (!puntoVendita) {

                return res.status(404).json({

                    successo: false,

                    errore:
                        "Punto vendita non trovato"

                });

            }


            if (
                !puntoVendita.tiscaliUsername ||
                !puntoVendita.tiscaliPassword
            ) {

                return res.status(400).json({

                    successo: false,

                    errore:
                        "Credenziali Tiscali non configurate"

                });

            }


            console.log(
                "TEST LOGIN TISCALI - PUNTO VENDITA:",
                puntoVenditaId
            );


            // Sessione Tiscali isolata per questo punto vendita/richiesta
            const sessioneTiscali =
                tiscali.creaClientTiscali();


            const login =
                await sessioneTiscali.loginTiscali(
                    puntoVendita.tiscaliUsername,
                    puntoVendita.tiscaliPassword
                );


            return res.json({

                successo:
                    login.successo === true,

                login: {

                    successo:
                        login.successo === true,

                    status:
                        login.status || null,

                    errore:
                        login.successo
                            ? null
                            : login.errore

                }

            });

        } catch (errore) {

            console.error(
                "ERRORE TEST LOGIN TISCALI:",
                errore
            );

            return res.status(500).json({

                successo: false,

                errore:
                    errore.message

            });

        }

    }
);


// =====================================================
// TEST LETTURA CARRELLO TISCALI
// =====================================================

app.post(
    "/ordine/test-carrello-tiscali",
    async (req, res) => {

        try {

            const {
                puntoVenditaId
            } = req.body;

            if (!puntoVenditaId) {

                return res.status(400).json({

                    successo: false,

                    errore:
                        "puntoVenditaId mancante"

                });

            }


            const puntoVendita =
                await new Promise(
                    (resolve, reject) => {

                        ordiniDatabase.getPuntoVenditaById(
                            puntoVenditaId,
                            (err, punto) => {

                                if (err) {
                                    reject(err);
                                    return;
                                }

                                resolve(punto);

                            }
                        );

                    }
                );


            if (!puntoVendita) {

                return res.status(404).json({

                    successo: false,

                    errore:
                        "Punto vendita non trovato"

                });

            }


            if (
                !puntoVendita.tiscaliUsername ||
                !puntoVendita.tiscaliPassword
            ) {

                return res.status(400).json({

                    successo: false,

                    errore:
                        "Credenziali Tiscali non configurate"

                });

            }


            console.log(
                "================================="
            );

            console.log(
                "TEST LETTURA CARRELLO TISCALI"
            );

            console.log(
                "PUNTO VENDITA:",
                puntoVenditaId
            );

            console.log(
                "================================="
            );


            // Sessione Tiscali isolata per questo punto vendita/richiesta
            const sessioneTiscali =
                tiscali.creaClientTiscali();


            const login =
                await sessioneTiscali.loginTiscali(
                    puntoVendita.tiscaliUsername,
                    puntoVendita.tiscaliPassword
                );


            if (!login.successo) {

                return res.status(500).json({

                    successo: false,

                    fase: "login",

                    login

                });

            }


            console.log(
                "LOGIN TISCALI OK"
            );


            const carrello =
                await sessioneTiscali.leggiCarrelloTiscali();


            console.log(
                "CARRELLO LETTO"
            );


            return res.json({

                successo: true,

                puntoVenditaId,

                login: {

                    successo: true,

                    status:
                        login.status || null

                },

                carrello

            });

        } catch (errore) {

            console.error(
                "ERRORE TEST CARRELLO TISCALI:",
                errore
            );

            return res.status(500).json({

                successo: false,

                errore:
                    errore.message

            });

        }

    }
);


// =====================================================
// INVIO ORDINE DATABASE → TISCALI
// =====================================================

app.post(
    "/ordine/invia-tiscali",
    async (req, res) => {

        try {

            const {
                ordineId
            } = req.body;


            if (!ordineId) {

                return res.status(400).json({

                    successo: false,

                    errore:
                        "ordineId mancante"

                });

            }


            console.log(
                "================================="
            );

            console.log(
                "INVIO ORDINE DB → TISCALI"
            );

            console.log(
                "ORDINE ID:",
                ordineId
            );

            console.log(
                "================================="
            );


            // -------------------------------------------------
            // 1. LEGGE L'ORDINE DAL DATABASE
            // -------------------------------------------------

            ordiniDatabase.getOrdineById(
                ordineId,
                async (err, ordine) => {

                    try {

                        if (err) {

                            return res.status(500).json({

                                successo: false,

                                fase: "database",

                                errore:
                                    err.message

                            });

                        }


                        if (!ordine) {

                            return res.status(404).json({

                                successo: false,

                                fase: "database",

                                errore:
                                    "Ordine non trovato"

                            });

                        }


                        if (
                            ordine.stato !== "APERTO"
                        ) {

                            return res.status(400).json({

                                successo: false,

                                fase: "ordine",

                                errore:
                                    "L'ordine non è aperto"

                            });

                        }


                        const prodottiOrdine =
                            ordine.prodotti.filter(
                                p =>
                                    Number(
                                        p.quantita
                                    ) > 0
                            );


                        if (
                            prodottiOrdine.length === 0
                        ) {

                            return res.status(400).json({

                                successo: false,

                                fase: "ordine",

                                errore:
                                    "L'ordine è vuoto"

                            });

                        }


                        // -------------------------------------------------
                        // 2. RECUPERA IL PUNTO VENDITA
                        // -------------------------------------------------

                        const puntoVendita =
                            await new Promise(
                                (resolve, reject) => {

                                    ordiniDatabase.getPuntoVenditaById(
                                        ordine.puntoVenditaId,
                                        (err, punto) => {

                                            if (err) {
                                                reject(err);
                                                return;
                                            }

                                            resolve(punto);

                                        }
                                    );

                                }
                            );


                        if (!puntoVendita) {

                            return res.status(404).json({

                                successo: false,

                                fase: "account",

                                errore:
                                    "Punto vendita non trovato"

                            });

                        }


                        if (
                            !puntoVendita.tiscaliUsername ||
                            !puntoVendita.tiscaliPassword
                        ) {

                            return res.status(400).json({

                                successo: false,

                                fase: "account",

                                errore:
                                    "Credenziali Tiscali non configurate"

                            });

                        }


                        // -------------------------------------------------
                        // 3. LOGIN TISCALI
                        // -------------------------------------------------

                        console.log(
                            "LOGIN TISCALI..."
                        );


                        // Sessione Tiscali dedicata esclusivamente a questo
                        // punto vendita per tutta la durata dell'ordine.
                        const sessioneTiscali =
                            tiscali.creaClientTiscali();


                        const login =
                            await sessioneTiscali.loginTiscali(
                                puntoVendita.tiscaliUsername,
                                puntoVendita.tiscaliPassword
                            );


                        if (!login.successo) {

                            return res.status(500).json({

                                successo: false,

                                fase: "login",

                                login

                            });

                        }


                        console.log(
                            "LOGIN TISCALI OK"
                        );


                        


                                                // -------------------------------------------------
                        // 4. RICERCA + AGGIUNTA PRODOTTI
                        // -------------------------------------------------

                        console.log(
                            "================================="
                        );

                        console.log(
                            "INIZIO INSERIMENTO ORDINE"
                        );

                        console.log(
                            "PRODOTTI DA INVIARE:",
                            prodottiOrdine.length
                        );

                        console.log(
                            "================================="
                        );


                        const risultati = [];


// -------------------------------------------------
// ELABORA TUTTI I PRODOTTI
// UN ERRORE NON DEVE BLOCCARE IL RESTO DELL'ORDINE
// -------------------------------------------------

for (
    const prodotto
    of prodottiOrdine
) {

    const codice =
        String(
            prodotto.codice || ""
        ).trim();

    const quantita =
        Number(
            prodotto.quantita || 0
        );


    console.log(
        "---------------------------------"
    );

    console.log(
        "INIZIO ELABORAZIONE PRODOTTO:",
        codice
    );

    console.log(
        "QUANTITÀ:",
        quantita
    );


    // -------------------------------------------------
    // PROVA IL SINGOLO PRODOTTO
    // -------------------------------------------------

    try {

        // -------------------------------------------------
        // 1. RICERCA PRODOTTO
        // -------------------------------------------------

        console.log(
            "RICERCA PRODOTTO:",
            codice
        );


        const ricerca =
            await sessioneTiscali.cercaProdottoTiscali(
                codice
            );


        // -------------------------------------------------
        // PRODOTTO NON TROVATO
        // -------------------------------------------------

        if (
            !ricerca ||
            !ricerca.successo ||
            !ricerca.productId
        ) {

            console.log(
                "❌ PRODOTTO NON TROVATO:",
                codice
            );


            risultati.push({

                codice,

                quantita,

                trovato: false,

                aggiunto: false,

                productId: null,

                errore:
                    ricerca?.errore ||
                    "Prodotto non trovato"

            });


            // IMPORTANTISSIMO:
            // passa direttamente al prodotto successivo

            continue;

        }


        // -------------------------------------------------
        // PRODOTTO TROVATO
        // -------------------------------------------------

        console.log(
            "✅ PRODOTTO TROVATO:",
            codice
        );

        console.log(
            "PRODUCT ID:",
            ricerca.productId
        );


        // -------------------------------------------------
        // 2. AGGIUNTA AL CARRELLO
        // -------------------------------------------------

        console.log(
            "AGGIUNTA AL CARRELLO:",
            codice
        );


        const aggiunta =
            await sessioneTiscali.aggiungiAlCarrelloTiscali(
                ricerca.productId,
                quantita
            );


        const aggiunto =
            aggiunta &&
            aggiunta.successo === true &&
            aggiunta.modalitaTest !== true;


        // -------------------------------------------------
        // SALVA RISULTATO
        // -------------------------------------------------

        risultati.push({

            codice,

            quantita,

            productId:
                ricerca.productId,

            trovato: true,

            aggiunto,

            errore:
                aggiunto
                    ? null
                    : (
                        aggiunta?.errore ||
                        "Errore durante l'aggiunta al carrello"
                    ),

            modalitaTest:
                aggiunta?.modalitaTest === true

        });


        if (aggiunto) {

            console.log(
                "✅ PRODOTTO AGGIUNTO:",
                codice
            );

        } else {

            console.log(
                "❌ ERRORE AGGIUNTA:",
                codice
            );

            console.log(
                "ERRORE:",
                aggiunta?.errore ||
                "Errore durante l'aggiunta"
            );

        }


    } catch (erroreProdotto) {

        // -------------------------------------------------
        // ERRORE IMPREVISTO DEL SINGOLO PRODOTTO
        // NON BLOCCA GLI ALTRI
        // -------------------------------------------------

        console.error(
            "❌ ERRORE SINGOLO PRODOTTO:",
            codice
        );

        console.error(
            erroreProdotto
        );


        risultati.push({

            codice,

            quantita,

            trovato: false,

            aggiunto: false,

            productId: null,

            errore:
                erroreProdotto.message ||
                "Errore durante la gestione del prodotto"

        });


        // IMPORTANTISSIMO:
        // continua con il prossimo prodotto

        continue;

    }

}


                        const errori =
    risultati.filter(
        p =>
            !p.aggiunto &&
            p.trovato === true &&
            p.modalitaTest !== true
    );

const prodottiNonTrovati =
    risultati.filter(
        p =>
            p.trovato === false
    );


// -------------------------------------------------
// CONTROLLO ORDINE COMPLETATO
// -------------------------------------------------

const ordineCompletato =
    errori.length === 0 &&
    prodottiNonTrovati.length === 0;


console.log(
    "================================="
);

console.log(
    "VERIFICA COMPLETAMENTO ORDINE"
);

console.log(
    "PRODOTTI TOTALI:",
    risultati.length
);

console.log(
    "PRODOTTI AGGIUNTI:",
    risultati.filter(
        p => p.aggiunto
    ).length
);

console.log(
    "PRODOTTI CON ERRORE:",
    errori.length
);

console.log(
    "PRODOTTI NON TROVATI:",
    prodottiNonTrovati.length
);

console.log(
    "ORDINE COMPLETATO:",
    ordineCompletato
);

console.log(
    "================================="
);


// -------------------------------------------------
// 5. CHIUDE ORDINE DB SOLO SE TUTTO OK
// -------------------------------------------------

if (
    ordineCompletato
) {

                            await new Promise(
                                (resolve) => {

                                    ordiniDatabase.chiudiOrdine(
                                        ordine.ordineId,
                                        (erroreChiusura) => {

                                            if (
                                                erroreChiusura
                                            ) {

                                                console.error(
                                                    "ERRORE CHIUSURA ORDINE:",
                                                    erroreChiusura
                                                );

                                            } else {

                                                console.log(
                                                    "ORDINE CHIUSO CORRETTAMENTE:",
                                                    ordine.ordineId
                                                );

                                            }

                                            resolve();

                                        }
                                    );

                                }
                            );

                        }


                        // -------------------------------------------------
                        // 6. SALVA RESOCONTO SU SUPABASE
                        // -------------------------------------------------

                        try {

                            await new Promise(
                                (resolve) => {

                                    ordiniDatabase.salvaResocontoInvio(
                                        ordine.puntoVenditaId,
                                        ordine.ordineId,
                                        ordineCompletato,
                                        prodottiOrdine.length,
                                        risultati.filter(
                                            p => p.aggiunto
                                        ).length,
                                        errori.length,
                                        prodottiNonTrovati.length,
                                        risultati,
                                        (erroreResoconto, resocontoId) => {

                                            if (erroreResoconto) {

                                                console.error(
                                                    "ERRORE SALVATAGGIO RESOCONTO INVIO:",
                                                    erroreResoconto
                                                );

                                            } else {

                                                console.log(
                                                    "RESOCONTO INVIO SALVATO:",
                                                    resocontoId
                                                );

                                            }

                                            resolve();

                                        }
                                    );

                                }
                            );

                        } catch (erroreResoconto) {

                            console.error(
                                "ERRORE IMPREVISTO SALVATAGGIO RESOCONTO:",
                                erroreResoconto
                            );

                        }


                        // -------------------------------------------------
                        // 7. RISPOSTA FINALE
                        // -------------------------------------------------

                        return res.json({

    successo:
        ordineCompletato,

                            ordineId:
                                ordine.ordineId,

                            prodottiInviati:
                                prodottiOrdine.length,

                            prodottiAggiunti:
                                risultati.filter(
                                    p =>
                                        p.aggiunto
                                ).length,

                            prodottiConErrore:
                                errori.length,

                                prodottiNonTrovati:
    prodottiNonTrovati.length,

                            risultati

                            

                        });

                    } catch (erroreInterno) {

                        console.error(
                            "ERRORE DURANTE INVIO ORDINE:",
                            erroreInterno
                        );

                        if (!res.headersSent) {

                            return res.status(500).json({

                                successo: false,

                                errore:
                                    erroreInterno.message

                            });

                        }

                    }

                }
            );

        } catch (errore) {

            console.error(
                "ERRORE INVIO ORDINE DB → TISCALI:",
                errore
            );

            return res.status(500).json({

                successo: false,

                errore:
                    errore.message

            });

        }

    }
);


// =====================================================
// CREAZIONE PDF
// =====================================================

app.post(
    "/crea-pdf",
    (req, res) => {

        try {

            const prodottiPDF =
                req.body.prodotti || [];


            console.log(
                "PRODOTTI ARRIVATI PDF:",
                prodottiPDF
            );


            const prodottiOrdinati =
                prodottiPDF.filter(
                    prodotto =>
                        Number(
                            prodotto.quantita
                        ) > 0
                );


            console.log(
                "PRODOTTI CON QUANTITÀ:",
                prodottiOrdinati
            );


            const doc =
                new PDFDocument();


            res.setHeader(
                "Content-Type",
                "application/pdf"
            );


            res.setHeader(
                "Content-Disposition",
                "attachment; filename=Ordine_Tiscali.pdf"
            );


            doc.pipe(res);


            doc.fontSize(18)
                .text("Ordine Tiscali");


            doc.moveDown();


            prodottiOrdinati.forEach(
                (prodotto, index) => {

                    doc
                        .fontSize(12)
                        .text(
                            `${index + 1}) ${prodotto.codice} - ${prodotto.descrizione} - Quantità: ${prodotto.quantita}`
                        );

                }
            );


            doc.end();

        } catch (errore) {

            console.error(
                "ERRORE CREAZIONE PDF:",
                errore
            );

            res.status(500).json({

                successo: false,

                errore:
                    errore.message

            });

        }

    }
);


// =====================================================
// LOGIN
// =====================================================

app.post(
    "/login",
    (req, res) => {

        console.log(
            "LOGIN RICEVUTO:",
            req.body
        );


        const {
            codice,
            password
        } = req.body;


        if (
            !codice ||
            !password
        ) {

            return res.status(400).json({

                successo: false,

                errore:
                    "Codice e password mancanti"

            });

        }


        // -------------------------------------------------
        // 1. CONTROLLO AMMINISTRATORE
        // -------------------------------------------------

        ordiniDatabase.verificaLoginAmministratore(
            codice,
            password,
            (err, amministratore) => {

                if (err) {

                    return res.status(500).json({

                        successo: false,

                        errore:
                            err.message

                    });

                }


                if (amministratore) {

                    console.log(
                        "LOGIN AMMINISTRATORE:",
                        amministratore
                    );


                    return res.json({

                        successo: true,

                        amministratoreId:
                            amministratore.id,

                        puntoVenditaId:
                            null,

                        nome:
                            amministratore.nome,

                        ruolo:
                            "amministratore"

                    });

                }


                // -------------------------------------------------
                // 2. CONTROLLO PUNTO VENDITA
                // -------------------------------------------------

                ordiniDatabase.verificaLogin(
                    codice,
                    password,
                    (err, puntoVendita) => {

                        if (err) {

                            return res.status(500).json({

                                successo: false,

                                errore:
                                    err.message

                            });

                        }


                        if (!puntoVendita) {

                            return res.status(401).json({

                                successo: false,

                                errore:
                                    "Credenziali errate"

                            });

                        }


                        console.log(
                            "LOGIN PUNTO VENDITA:",
                            puntoVendita
                        );


                        return res.json({

                            successo: true,

                            puntoVenditaId:
                                puntoVendita.id,

                            amministratoreId:
                                null,

                            nome:
                                puntoVendita.nome,

                            ruolo:
                                puntoVendita.ruolo ||
                                "negozio"

                        });

                    }
                );

            }
        );

    }
);


// =====================================================
// MODIFICA ACCOUNT PUNTO VENDITA
// =====================================================

app.post(
    "/account/modifica",
    (req, res) => {

        const {
            id,
            password,
            tiscaliUsername,
            tiscaliPassword
        } = req.body;


        if (!id) {

            return res.status(400).json({

                successo: false,

                errore:
                    "ID account mancante"

            });

        }


        ordiniDatabase.aggiornaMioAccount(
            id,
            password,
            tiscaliUsername,
            tiscaliPassword,
            (err) => {

                if (err) {

                    console.error(
                        "Errore aggiornamento account:",
                        err
                    );


                    return res.status(500).json({

                        successo: false,

                        errore:
                            err.message

                    });

                }


                return res.json({

                    successo: true,

                    messaggio:
                        "Account aggiornato"

                });

            }
        );

    }
);


// =====================================================
// CREAZIONE PUNTO VENDITA DA PARTE ADMIN
// =====================================================

app.post(
    "/admin/crea-punto-vendita",
    (req, res) => {

        const {
            amministratoreId,
            nome,
            codice,
            password,
            tiscaliUsername,
            tiscaliPassword
        } = req.body;


        if (
            !amministratoreId ||
            !nome ||
            !codice ||
            !password
        ) {

            return res.status(400).json({

                successo: false,

                errore:
                    "Dati mancanti"

            });

        }


        ordiniDatabase.getAmministratoreById(
            amministratoreId,
            (err, amministratore) => {

                if (err) {

                    console.error(
                        "Errore controllo amministratore:",
                        err
                    );


                    return res.status(500).json({

                        successo: false,

                        errore:
                            err.message

                    });

                }


                if (
                    !amministratore ||
                    Number(
                        amministratore.attivo
                    ) !== 1
                ) {

                    return res.status(403).json({

                        successo: false,

                        errore:
                            "Accesso negato"

                    });

                }


                ordiniDatabase.creaPuntoVendita(
    nome,
    codice,
    password,
    tiscaliUsername || "",
    tiscaliPassword || "",
    (errore, idPuntoVendita) => {

        if (errore) {

            console.error(
                "Errore creazione punto vendita:",
                errore
            );

            return res.status(500).json({

                successo: false,

                errore:
                    errore.message

            });

        }

        return res.json({

            successo: true,

            messaggio:
                "Punto vendita creato",

            puntoVenditaId:
                idPuntoVendita

        });

    }
);

            }
        );

    }
);


// =====================================================
// DATI PUNTO VENDITA ADMIN
// =====================================================

app.get(
    "/admin/punto-vendita/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        ordiniDatabase.getPuntoVenditaById(
            id,
            (err, punto) => {

                if (err) {

                    return res.status(500).json({

                        successo: false,

                        errore:
                            err.message

                    });

                }


                if (!punto) {

                    return res.status(404).json({

                        successo: false,

                        errore:
                            "Punto vendita non trovato"

                    });

                }


                return res.json({

                    successo: true,

                    puntoVenditaId:
                        punto.id,

                    nome:
                        punto.nome,

                    codice:
                        punto.codice,

                    tiscaliUsernamePresente:
                        !!punto.tiscaliUsername,

                    tiscaliPasswordPresente:
                        !!punto.tiscaliPassword

                });

            }
        );

    }
);


// =====================================================
// LISTA PUNTI VENDITA ADMIN
// =====================================================

app.get(
    "/admin/punti-vendita",
    (req, res) => {

        ordiniDatabase.getTuttiPuntiVendita(
            (err, punti) => {

                if (err) {

                    console.error(
                        "Errore caricamento punti vendita:",
                        err
                    );


                    return res.status(500).json({

                        successo: false,

                        errore:
                            err.message

                    });

                }


                return res.json({

                    successo: true,

                    punti

                });

            }
        );

    }
);


// =====================================================
// DISATTIVA PUNTO VENDITA
// =====================================================

app.post(
    "/admin/disattiva-punto-vendita",
    (req, res) => {

        const {
            id
        } = req.body;


        if (!id) {

            return res.status(400).json({

                successo: false,

                errore:
                    "ID punto vendita mancante"

            });

        }


        ordiniDatabase.disattivaPuntoVendita(
            id,
            (err) => {

                if (err) {

                    return res.status(500).json({

                        successo: false,

                        errore:
                            err.message

                    });

                }


                return res.json({

                    successo: true

                });

            }
        );

    }
);


// =====================================================
// RIATTIVA PUNTO VENDITA
// =====================================================

app.post(
    "/admin/riattiva-punto-vendita",
    (req, res) => {

        const {
            id
        } = req.body;


        if (!id) {

            return res.status(400).json({

                successo: false,

                errore:
                    "ID punto vendita mancante"

            });

        }


        ordiniDatabase.riattivaPuntoVendita(
            id,
            (err) => {

                if (err) {

                    console.error(
                        err
                    );


                    return res.status(500).json({

                        successo: false,

                        errore:
                            err.message

                    });

                }


                return res.json({

                    successo: true

                });

            }
        );

    }
);


// =====================================================
// MODIFICA PUNTO VENDITA ADMIN
// =====================================================

app.post(
    "/admin/modifica-punto-vendita",
    (req, res) => {

        const {
            id,
            nome,
            codice,
            password,
            tiscaliUsername,
            tiscaliPassword
        } = req.body;


        if (!id) {

            return res.status(400).json({

                successo: false,

                errore:
                    "ID punto vendita mancante"

            });

        }


        ordiniDatabase.modificaPuntoVendita(
            id,
            nome,
            codice,
            password,
            tiscaliUsername,
            tiscaliPassword,
            (err) => {

                if (err) {

                    return res.status(500).json({

                        successo: false,

                        errore:
                            err.message

                    });

                }


                return res.json({

                    successo: true,

                    messaggio:
                        "Account modificato"

                });

            }
        );

    }
);


// =====================================================
// ACCOUNT PUNTO VENDITA
// =====================================================

app.get(
    "/account/:id",
    (req, res) => {

        const id =
            req.params.id;


        ordiniDatabase.getPuntoVenditaById(
            id,
            (err, puntoVendita) => {

                if (err) {

                    console.error(
                        "Errore recupero account:",
                        err
                    );


                    return res.status(500).json({

                        successo: false,

                        errore:
                            err.message

                    });

                }


                if (!puntoVendita) {

                    return res.status(404).json({

                        successo: false,

                        errore:
                            "Punto vendita non trovato"

                    });

                }


                return res.json({

                    successo: true,

                    puntoVendita

                });

            }
        );

    }
);


// =====================================================
// AVVIO SERVER
// =====================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "================================="
        );

        console.log(
            "SERVER ORDINI TISCALI AVVIATO"
        );

        console.log(
            "PORTA:",
            PORT
        );

        console.log(
            "================================="
        );

    }
);

