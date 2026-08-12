
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const tiscali = require("./tiscali");
const ordiniDatabase = require("./ordiniDatabase");









const puntiVendita = require("./puntiVendita");
const prodotti = require("./prodotti");
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

const upload = multer({
    dest: "uploads/"
});

app.use(cors());
app.use(express.json());









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
                    amministratoreId: amministratore.id
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

app.get("/", (req, res) => {
    res.send("Ordini Tiscali v2 - Server attivo");
});


// =====================================================
// DATI APP
// =====================================================

app.get("/punti-vendita", (req, res) => {
    res.json(puntiVendita);
});

app.get("/prodotti", (req, res) => {
    res.json(prodotti);
});

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

        if (!codice || Number(quantita) <= 0) {

            return res.status(400).json({
                successo: false,
                errore: "Codice o quantità non validi"
            });

        }

        const ordine = ordini.aggiungiProdotto(
            codice,
            Number(quantita)
        );

        res.json({
            successo: true,
            ordine: ordine
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

        if (!codice || Number(quantita) < 0) {

            return res.status(400).json({
                successo: false,
                errore: "Codice o quantità non validi"
            });

        }

        const ordine = ordini.modificaQuantita(
            codice,
            Number(quantita)
        );

        res.json({
            successo: true,
            ordine: ordine
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
                errore: "Codice prodotto mancante"
            });

        }

        const ordine = ordini.eliminaProdotto(codice);

        res.json({
            successo: true,
            ordine: ordine
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

        const ordine = ordini.azzeraOrdine();

        res.json({
            successo: true,
            ordine: ordine
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
// DATABASE ORDINI
// =====================================================

app.post("/ordine/apri", (req, res) => {

    const {
        puntoVenditaId
    } = req.body;

    if (!puntoVenditaId) {

        return res.status(400).json({
            successo: false,
            errore: "Punto vendita mancante"
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
            errore: "Dati prodotto non validi"
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
            errore: "Dati modifica non validi"
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

    if (!ordineId || !codice) {

        return res.status(400).json({
            successo: false,
            errore: "Ordine o codice mancanti"
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
            errore: "ID ordine mancante"
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
                messaggio: "Ordine azzerato"
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
        console.log("RICEVUTO UPLOAD EXCEL");
        console.log("FILE RICEVUTO:", req.file);

        try {

            if (!req.file) {

                return res.status(400).json({
                    successo: false,
                    errore: "Nessun file ricevuto"
                });

            }

            const filePath =
                req.file.path;

            const workbook =
                XLSX.readFile(filePath);
                console.log("LETTO EXCEL OK");

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
console.log("PRODOTTI CREATI:", dati.length);
console.log(
    "INVIO PRODOTTI AL TELEFONO:",
    dati.length
);
            res.json({

                successo: true,

                prodotti: dati

            });

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

app.post("/cerca-prodotti-excel", async (req, res) => {

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

});


// =====================================================
// SIMULAZIONE ORDINE
// NON MODIFICA IL CARRELLO TISCALI
// =====================================================

app.post("/simula-ordine-excel", async (req, res) => {

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

});


// =====================================================
// INVIO ORDINE REALE A TISCALI
// =====================================================

app.post("/ordine-tiscali", async (req, res) => {

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


            // CERCA PRODOTTO

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


            // AGGIUNGI AL CARRELLO

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

});


// =====================================================
// GESTIONE CARRELLO TISCALI
// =====================================================

app.get("/leggi-carrello-tiscali", async (req, res) => {

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

        res.json({

            successo: true,

            carrello

        });

    } catch (errore) {

        console.error(
            "ERRORE LETTURA CARRELLO:",
            errore
        );

        res.status(500).json({

            successo: false,

            errore:
                errore.message

        });

    }

});


app.post("/carrello/rimuovi", async (req, res) => {

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

        res.json(risultato);

    } catch (errore) {

        console.error(
            "ERRORE RIMOZIONE CARRELLO:",
            errore
        );

        res.status(500).json({

            successo: false,

            errore:
                errore.message

        });

    }

});


app.post("/ordine/test-login-tiscali", async (req, res) => {

    try {

        const { puntoVenditaId } = req.body;

        if (!puntoVenditaId) {

            return res.status(400).json({
                successo: false,
                errore: "puntoVenditaId mancante"
            });

        }

        const puntoVendita =
            await new Promise((resolve, reject) => {

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

            });

        if (!puntoVendita) {

            return res.status(404).json({
                successo: false,
                errore: "Punto vendita non trovato"
            });

        }

        if (
            !puntoVendita.tiscaliUsername ||
            !puntoVendita.tiscaliPassword
        ) {

            return res.status(400).json({
                successo: false,
                errore: "Credenziali Tiscali non configurate"
            });

        }

        console.log(
            "TEST LOGIN TISCALI - PUNTO VENDITA:",
            puntoVenditaId
        );

        const login =
            await tiscali.loginTiscali(
                puntoVendita.tiscaliUsername,
                puntoVendita.tiscaliPassword
            );

        return res.json({

            successo: login.successo === true,

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

            errore: errore.message

        });

    }

});



// =====================================================
// TEST LETTURA CARRELLO TISCALI
// =====================================================

app.post("/ordine/test-carrello-tiscali", async (req, res) => {

    try {

        const { puntoVenditaId } = req.body;

        if (!puntoVenditaId) {

            return res.status(400).json({
                successo: false,
                errore: "puntoVenditaId mancante"
            });

        }

        // ---------------------------------------------
        // 1. RECUPERA IL PUNTO VENDITA
        // ---------------------------------------------

        const puntoVendita =
            await new Promise((resolve, reject) => {

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

            });

        if (!puntoVendita) {

            return res.status(404).json({
                successo: false,
                errore: "Punto vendita non trovato"
            });

        }

        // ---------------------------------------------
        // 2. CONTROLLA CREDENZIALI
        // ---------------------------------------------

        if (
            !puntoVendita.tiscaliUsername ||
            !puntoVendita.tiscaliPassword
        ) {

            return res.status(400).json({
                successo: false,
                errore: "Credenziali Tiscali non configurate"
            });

        }

        console.log("=================================");
        console.log("TEST LETTURA CARRELLO TISCALI");
        console.log(
            "PUNTO VENDITA:",
            puntoVenditaId
        );
        console.log("=================================");

        // ---------------------------------------------
        // 3. LOGIN
        // ---------------------------------------------

        const login =
            await tiscali.loginTiscali(
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

        console.log("LOGIN TISCALI OK");

        // ---------------------------------------------
        // 4. LEGGE IL CARRELLO
        // ---------------------------------------------

        const carrello =
            await tiscali.leggiCarrelloTiscali();

        console.log("CARRELLO LETTO");

        // ---------------------------------------------
        // 5. RISPOSTA
        // ---------------------------------------------

        return res.json({

            successo: true,

            puntoVenditaId,

            login: {
                successo: true,
                status: login.status || null
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

            errore: errore.message

        });

    }

});

app.post("/ordine/invia-tiscali", async (req, res) => {

    try {

        const { ordineId } = req.body;

        if (!ordineId) {
            return res.status(400).json({
                successo: false,
                errore: "ordineId mancante"
            });
        }

        console.log("=================================");
        console.log("INVIO ORDINE DB → TISCALI");
        console.log("ORDINE ID:", ordineId);
        console.log("=================================");

        // 1. LEGGE L'ORDINE DAL DATABASE

        ordiniDatabase.getOrdineById(
            ordineId,
            async (err, ordine) => {

                if (err) {
                    return res.status(500).json({
                        successo: false,
                        fase: "database",
                        errore: err.message
                    });
                }

                if (!ordine) {
                    return res.status(404).json({
                        successo: false,
                        fase: "database",
                        errore: "Ordine non trovato"
                    });
                }

                if (ordine.stato !== "APERTO") {
                    return res.status(400).json({
                        successo: false,
                        fase: "ordine",
                        errore: "L'ordine non è aperto"
                    });
                }

                const prodotti =
                    ordine.prodotti.filter(
                        p => Number(p.quantita) > 0
                    );

                if (prodotti.length === 0) {
                    return res.status(400).json({
                        successo: false,
                        fase: "ordine",
                        errore: "L'ordine è vuoto"
                    });
                }

                // 2. LOGIN TISCALI

                const puntoVendita =
    await new Promise((resolve, reject) => {

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

    });

if (!puntoVendita) {

    return res.status(404).json({
        successo: false,
        fase: "account",
        errore: "Punto vendita non trovato"
    });

}

if (
    !puntoVendita.tiscaliUsername ||
    !puntoVendita.tiscaliPassword
) {

    return res.status(400).json({
        successo: false,
        fase: "account",
        errore: "Credenziali Tiscali non configurate"
    });

}

const login =
    await tiscali.loginTiscali(
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

                // 3. RICERCA + AGGIUNTA

                const risultati = [];

                for (const prodotto of prodotti) {

                    const ricerca =
                        await tiscali.cercaProdottoTiscali(
                            prodotto.codice
                        );

                    if (
                        !ricerca.successo ||
                        !ricerca.productId
                    ) {

                        risultati.push({
                            codice: prodotto.codice,
                            quantita: prodotto.quantita,
                            trovato: false,
                            aggiunto: false,
                            errore:
                                ricerca.errore ||
                                "Prodotto non trovato"
                        });

                        continue;
                    }

                    const aggiunta =
                        await tiscali.aggiungiAlCarrelloTiscali(
                            ricerca.productId,
                            prodotto.quantita
                        );

                    risultati.push({
    codice: prodotto.codice,
    quantita: prodotto.quantita,
    productId: ricerca.productId,
    trovato: true,

    aggiunto:
        aggiunta.successo === true &&
        aggiunta.modalitaTest !== true,

    errore:
        aggiunta.successo
            ? null
            : aggiunta.errore,

    modalitaTest:
        aggiunta.modalitaTest === true
});
                }

                // 4. VERIFICA CARRELLO

                const carrello =
                    await tiscali.verificaCarrelloTiscali();

                const errori =
    risultati.filter(
        p =>
            !p.aggiunto &&
            p.modalitaTest !== true
    );

                if (errori.length === 0) {

    ordiniDatabase.chiudiOrdine(
        ordine.ordineId,
        (erroreChiusura) => {

            if (erroreChiusura) {

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

        }
    );

}


return res.json({

    successo:
        errori.length === 0,

    ordineId:
        ordine.ordineId,

    prodottiInviati:
        prodotti.length,

    prodottiAggiunti:
        risultati.filter(
            p => p.aggiunto
        ).length,

    prodottiConErrore:
        errori.length,

    risultati,

    carrello

});

            }
        );

    } catch (errore) {

        console.error(
            "ERRORE INVIO ORDINE DB → TISCALI:",
            errore
        );

        return res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});
app.post("/svuota-carrello-tiscali", async (req, res) => {

    try {
const test =
    await tiscali.leggiCarrelloTiscali();

console.log(
    "CONTROLLO PRIMA SVUOTAMENTO:",
    test.articoli
);
        const risultato =
            await tiscali.svuotaCarrelloTiscali();

        console.log(
            "RISULTATO SVUOTAMENTO:",
            risultato
        );

        res.json(risultato);

    } catch (errore) {

        console.error(errore);

        res.status(500).json({
            successo:false,
            errore:errore.message
        });

    }

});
app.post("/ordine/invia-tiscali", async (req, res) => {

    try {

        const { ordineId } = req.body;

        if (!ordineId) {
            return res.status(400).json({
                successo: false,
                errore: "ordineId mancante"
            });
        }

        console.log("=================================");
        console.log("INVIO ORDINE → TISCALI");
        console.log("ORDINE ID:", ordineId);
        console.log("=================================");

        // LEGGE L'ORDINE DAL DATABASE

        ordiniDatabase.getOrdineById(
            ordineId,
            async (err, ordine) => {

                if (err) {
                    return res.status(500).json({
                        successo: false,
                        fase: "database",
                        errore: err.message
                    });
                }

                if (!ordine) {
                    return res.status(404).json({
                        successo: false,
                        fase: "database",
                        errore: "Ordine non trovato"
                    });
                }

                if (ordine.stato !== "APERTO") {
                    return res.status(400).json({
                        successo: false,
                        fase: "ordine",
                        errore: "L'ordine non è aperto"
                    });
                }

                const prodotti =
                    ordine.prodotti.filter(
                        p => Number(p.quantita) > 0
                    );

                if (prodotti.length === 0) {
                    return res.status(400).json({
                        successo: false,
                        fase: "ordine",
                        errore: "Ordine vuoto"
                    });
                }

                // LOGIN TISCALI

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

                console.log("LOGIN TISCALI OK");

                const risultati = [];

                // RICERCA E AGGIUNTA DEI PRODOTTI

                for (const prodotto of prodotti) {

                    console.log(
                        "RICERCA:",
                        prodotto.codice,
                        "QTA:",
                        prodotto.quantita
                    );

                    const ricerca =
                        await tiscali.cercaProdottoTiscali(
                            prodotto.codice
                        );

                    if (
                        !ricerca.successo ||
                        !ricerca.productId
                    ) {

                        risultati.push({
                            codice: prodotto.codice,
                            quantita: prodotto.quantita,
                            trovato: false,
                            aggiunto: false,
                            errore:
                                ricerca.errore ||
                                "Prodotto non trovato"
                        });

                        continue;
                    }

                    const aggiunta =
                        await tiscali.aggiungiAlCarrelloTiscali(
                            ricerca.productId,
                            prodotto.quantita
                        );

                    risultati.push({
                        codice: prodotto.codice,
                        quantita: prodotto.quantita,
                        productId: ricerca.productId,
                        trovato: true,
                        aggiunto:
                            aggiunta.successo === true,
                        errore:
                            aggiunta.successo
                                ? null
                                : aggiunta.errore || "Errore aggiunta"
                    });

                }

                // VERIFICA FINALE DEL CARRELLO

                const carrello =
                    await tiscali.verificaCarrelloTiscali();

                const prodottiAggiunti =
                    risultati.filter(
                        p => p.aggiunto
                    );

                const errori =
                    risultati.filter(
                        p => !p.aggiunto
                    );

                console.log("=================================");
                console.log("FINE INVIO ORDINE");
                console.log(
                    "AGGIUNTI:",
                    prodottiAggiunti.length
                );
                console.log(
                    "ERRORI:",
                    errori.length
                );
                console.log("=================================");

                return res.json({

                    successo:
                        errori.length === 0,

                    ordineId:
                        ordine.ordineId,

                    prodottiInviati:
                        prodotti.length,

                    prodottiAggiunti:
                        prodottiAggiunti.length,

                    prodottiConErrore:
                        errori.length,

                    risultati:

                        risultati,

                    carrello:

                        carrello

                });

            }
        );

    } catch (errore) {

        console.error(
            "ERRORE INVIO ORDINE TISCALI:",
            errore
        );

        return res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});
app.post("/crea-pdf", (req, res) => {

    try {

        const prodotti = req.body.prodotti;

        const doc = new PDFDocument();
        console.log("PRODOTTI ARRIVATI PDF:", prodotti);
        console.log(
    "PRODOTTI CON QUANTITA:",
    prodotti.filter(p => Number(p.quantita) > 0)
);

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

const prodottiOrdinati = prodotti.filter(
    prodotto => Number(prodotto.quantita) > 0
);
        prodottiOrdinati.forEach((prodotto, index) => {


            

                doc.fontSize(12).text(
                    `${index + 1}) ${prodotto.codice} - ${prodotto.descrizione} - Quantità: ${prodotto.quantita}`
                );


        });

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

});

app.post("/login", (req, res) => {
    console.log(
    "LOGIN RICEVUTO:",
    req.body
);

    const {
        codice,
        password
    } = req.body;


    if (!codice || !password) {

        return res.status(400).json({

            successo: false,

            errore: "Codice e password mancanti"

        });

    }


    ordiniDatabase.verificaLogin(
        codice,
        password,
        (err, puntoVendita) => {


            if (err) {

                return res.status(500).json({

                    successo: false,

                    errore: err.message

                });

            }


            if (!puntoVendita) {

    return res.status(401).json({

        successo: false,

        errore: "Credenziali errate"

    });

}

console.log(
    "DATI LOGIN TROVATI:",
    puntoVendita
);

res.json({

    successo: true,

    puntoVenditaId:
        puntoVendita.id,

    nome:
        puntoVendita.nome,

    ruolo:
        puntoVendita.ruolo

});


        }
    );

});
app.post("/account/modifica", (req, res) => {

    const {
        id,
        password,
        tiscaliUsername,
        tiscaliPassword
    } = req.body;


    if (!id) {

        return res.status(400).json({

            successo:false,

            errore:"ID punto vendita mancante"

        });

    }


    ordiniDatabase.aggiornaMioAccount(
        id,
        password,
        tiscaliUsername,
        tiscaliPassword,
        (err)=>{


            if(err){

                console.error(
                    "Errore aggiornamento account:",
                    err
                );


                return res.status(500).json({

                    successo:false,

                    errore:err.message

                });

            }


            res.json({

                successo:true,

                messaggio:
                "Account aggiornato"

            });


        }
    );


});
app.post("/admin/crea-punto-vendita", (req, res) => {

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


    ordiniDatabase.getPuntoVenditaById(
        amministratoreId,
        (err, amministratore) => {


            if (err) {

                console.error(
                    "Errore controllo admin:",
                    err
                );

                return res.status(500).json({

                    successo: false,

                    errore:
                        "Errore database"

                });

            }


            if (
                !amministratore ||
                amministratore.ruolo !== "amministratore"
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
                tiscaliPassword || ""
            );


            res.json({

                successo: true,

                messaggio:
                    "Punto vendita creato"

            });


        }
    );

});

app.get("/admin/punti-vendita", (req, res) => {


    ordiniDatabase.getTuttiPuntiVendita(
        (err, punti) => {


            if (err) {

                console.error(
                    "Errore caricamento punti vendita:",
                    err
                );


                return res.status(500).json({

                    successo:false,

                    errore:
                        err.message

                });

            }


            res.json({

                successo:true,

                punti

            });


        }
    );

});
app.post("/admin/disattiva-punto-vendita", (req, res) => {

    const { id } = req.body;


    ordiniDatabase.disattivaPuntoVendita(
        id,
        (err) => {

            if (err) {

                return res.status(500).json({

                    successo:false,

                    errore:err.message

                });

            }


            res.json({

                successo:true

            });

        }
    );

});
app.post("/admin/riattiva-punto-vendita", (req, res) => {


    const {
        id
    } = req.body;


    ordiniDatabase.riattivaPuntoVendita(
        id,
        (err) => {


            if (err) {

                console.error(err);

                return res.status(500).json({

                    successo:false,

                    errore:err.message

                });

            }


            res.json({

                successo:true

            });


        }
    );


});
app.post("/admin/modifica-punto-vendita", (req, res) => {


    const {
        id,
        nome,
        codice,
        password,
        tiscaliUsername,
        tiscaliPassword
    } = req.body;



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

                    successo:false,

                    errore:err.message

                });

            }


            res.json({

                successo:true,

                messaggio:
                "Account modificato"

            });


        }
    );


});
app.post("/account/modifica", (req, res) => {


    const {
        id,
        password,
        tiscaliUsername,
        tiscaliPassword
    } = req.body;



    if (!id) {

        return res.status(400).json({

            successo:false,

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
                    "Errore modifica account:",
                    err
                );


                return res.status(500).json({

                    successo:false,

                    errore:
                        err.message

                });

            }



            res.json({

                successo:true,

                messaggio:
                    "Account aggiornato"

            });


        }
    );


});
app.get("/account/:id", (req, res) => {

    const id = req.params.id;


    ordiniDatabase.getPuntoVenditaById(
        id,
        (err, puntoVendita) => {


            if (err) {

                console.error(
                    "Errore recupero account:",
                    err
                );


                return res.status(500).json({

                    successo:false,

                    errore:err.message

                });

            }


            if (!puntoVendita) {

                return res.status(404).json({

                    successo:false,

                    errore:"Punto vendita non trovato"

                });

            }


            res.json({

                successo:true,

                puntoVendita:puntoVendita

            });


        }
    );

});



// =====================================================
// AVVIO SERVER
// =====================================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Server avviato sulla porta ${PORT}`
    );

});

