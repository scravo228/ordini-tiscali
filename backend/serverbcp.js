require("dotenv").config();
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const XLSX = require("xlsx");
const tiscali = require("./tiscali");

require("dotenv").config();

const db = require("./database");
const ordiniDatabase = require("./ordiniDatabase");


const puntiVendita = require("./puntiVendita");
const prodotti = require("./prodotti");
const listaPuntiVendita = require("./listaPuntiVendita");
const ordineCorrente = require("./ordineCorrente");
const ordini = require("./ordini");
const upload = multer({
    dest:"uploads/"
});

const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {

    res.send("Ordini Tiscali v2 - Server attivo");

});


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
app.get("/test-ordine", (req, res) => {

    const ordine = ordini.aggiungiProdotto(
        "2331/D",
        5
    );

    res.json(ordine);

});
app.get("/modifica-ordine", (req, res) => {

    const ordine = ordini.modificaQuantita(
        "2331/D",
        10
    );

    res.json(ordine);

});
app.post("/ordine/aggiungi", async (req, res) => {

    try {

        const { codice, quantita } = req.body;

        console.log("=================================");
        console.log("RICHIESTA AGGIUNTA ORDINE");
        console.log("CODICE:", codice);
        console.log("QUANTITÀ:", quantita);
        console.log("=================================");

        // ==============================
        // 1. SALVA IL PRODOTTO NELL'ORDINE
        // ==============================

        const ordine = ordini.aggiungiProdotto(
            codice,
            quantita
        );

        console.log("PRODOTTO SALVATO NELL'ORDINE:");
        console.dir(ordine, { depth: null });

        // ==============================
        // 2. CERCA IL PRODOTTO SU TISCALI
        // ==============================

        console.log("CERCO PRODOTTO SU TISCALI...");

        const risultatoTiscali =
            await cercaProdottoTiscali(codice);

        console.log("RISULTATO CERCA TISCALI:");
        console.dir(risultatoTiscali, { depth: null });

        // ==============================
        // 3. CONTROLLO PRODOTTO
        // ==============================

        if (
            !risultatoTiscali ||
            !risultatoTiscali.prodottoTrovato ||
            !risultatoTiscali.productId
        ) {

            console.error(
                "PRODOTTO NON TROVATO SU TISCALI:",
                codice
            );

            return res.status(404).json({

                successo: false,

                messaggio:
                    "Prodotto salvato nell'ordine ma non trovato su Tiscali",

                ordine: ordine,

                tiscali:
                    risultatoTiscali

            });

        }

        // ==============================
        // 4. AGGIUNGI AL CARRELLO TISCALI
        // ==============================

        console.log(
            "PRODUCT ID TISCALI:",
            risultatoTiscali.productId
        );

        console.log(
            "AGGIUNGO AL CARRELLO TISCALI..."
        );

        const risultatoCarrello =
            await aggiungiAlCarrelloTiscali(
                risultatoTiscali.productId,
                quantita
            );

        console.log("RISULTATO CARRELLO:");
        console.dir(
            risultatoCarrello,
            { depth: null }
        );

        // ==============================
        // 5. RISPOSTA FINALE
        // ==============================

        return res.json({

            successo: true,

            ordine: ordine,

            tiscali: {

                codice: codice,

                productId:
                    risultatoTiscali.productId,

                descrizione:
                    risultatoTiscali.descrizioneTrovata,

                carrello:
                    risultatoCarrello

            }

        });

    } catch (errore) {

        console.error(
            "================================="
        );

        console.error(
            "ERRORE /ordine/aggiungi"
        );

        console.error(
            errore.message
        );

        console.error(
            "================================="
        );

        return res.status(500).json({

            successo: false,

            errore:
                errore.message

        });

    }

});
app.get("/elimina-ordine", (req, res) => {

    const ordine = ordini.eliminaProdotto(
        "2331/D"
    );

    res.json(ordine);

});
app.get("/azzera-ordine", (req, res) => {

    const ordine = ordini.azzeraOrdine();

    res.json(ordine);

});
app.get("/crea-ordine-db", (req, res) => {


    ordiniDatabase.creaOrdine(
        1,
        (err, idOrdine) => {


            if(err){

                res.json({
                    errore: err.message
                });

            } else {


                res.json({
                    messaggio: "Ordine creato",
                    idOrdine: idOrdine
                });


            }


        }
    );


});
app.post("/ordine/azzera", (req, res) => {

    const { ordineId } = req.body;


    ordiniDatabase.azzeraOrdine(
        ordineId,
        function(err){

            if(err){

                res.status(500).json({
                    errore: err.message
                });

            } else {

                res.json({
                    messaggio:"Ordine azzerato"
                });

            }

        }
    );

});
app.post("/upload-excel", upload.single("file"), (req, res) => {

    try {

        const filePath = req.file.path;

        const workbook = XLSX.readFile(filePath);

        const sheetName = workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];


        const righe = XLSX.utils.sheet_to_json(sheet, {
            defval:""
        });


        const dati = righe
        .map(riga => {

            const valori = Object.values(riga);

            return {
                codice: String(valori[0] || "").trim(),
                descrizione: String(valori[1] || "").trim(),
                unita: String(valori[2] || "").trim(),
                quantita: Number(valori[3]) || 0
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


        res.json({
            prodotti:dati
        });


    } catch(err) {

        res.json({
            errore:err.message
        });

    }

});
async function aggiungiProdottoAlCarrelloTiscali(
    productId,
    quantita,
    token
) {
    try {

        if (!productId) {
            return {
                successo: false,
                errore: "Product ID mancante"
            };
        }

        if (!token) {
            return {
                successo: false,
                errore: "RequestVerificationToken mancante"
            };
        }

        const dati = new URLSearchParams();

        dati.append("_id", String(productId));
        dati.append("_quantity", String(quantita));
        dati.append("_size", "null");
        dati.append("_structure", "");
        dati.append("_idPadreStruttura", "");
        dati.append("_options", "");
        dati.append("_articles", "null");
        dati.append("_boxId", "");
        dati.append("_tipologia", "0");
        dati.append("_gestioneRiga", "");
        dati.append("_promotion", "");
        dati.append("_wishlist", "");
        dati.append("_carid", "");
        dati.append("_rowid", "");
        dati.append(
            "__RequestVerificationToken",
            token
        );

        console.log("---------------------------------");
        console.log("CART/ADD");
        console.log("PRODUCT ID:", productId);
        console.log("QUANTITÀ:", quantita);
        console.log("---------------------------------");

        const risposta = await fetch(
            "https://www.tiscaliformaggi.com/Async/Cart/Add",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded; charset=UTF-8",

                    "X-Requested-With":
                        "XMLHttpRequest"
                },

                body: dati.toString()
            }
        );

        const testo = await risposta.text();

        console.log(
            "RISPOSTA CART/ADD:",
            risposta.status
        );

        console.log(
            testo.substring(0, 1000)
        );

        let risultato;

        try {

            risultato = JSON.parse(testo);

        } catch (e) {

            return {
                successo: false,
                errore: "Risposta Cart/Add non JSON",
                status: risposta.status,
                risposta:
                    testo.substring(0, 1000)
            };

        }

        const successo =
            risposta.ok &&
            risultato.errore === false;

        console.log(
            "CART/ADD SUCCESSO:",
            successo
        );

        if (risultato.allProducts) {

            console.log(
                "PRODOTTI NEL CARRELLO:",
                risultato.allProducts.length
            );

        }

        return {

            successo: successo,

            status: risposta.status,

            productId:
                String(productId),

            quantita:
                Number(quantita),

            risultato:
                risultato

        };

    } catch (errore) {

        console.error(
            "ERRORE CART/ADD:",
            errore
        );

        return {

            successo: false,

            errore:
                errore.message

        };

    }
}
app.post("/simula-ordine-tiscali", async (req, res) => {

    try {

        const prodottiExcel = req.body.prodotti || [];

        if (
            !Array.isArray(prodottiExcel) ||
            prodottiExcel.length === 0
        ) {

            return res.status(400).json({
                successo: false,
                errore: "Nessun prodotto ricevuto"
            });

        }

        console.log("=================================");
        console.log("SIMULAZIONE ORDINE TISCALI");
        console.log(
            "PRODOTTI RICEVUTI:",
            prodottiExcel.length
        );
        console.log(
            "MODALITÀ TEST:",
            process.env.TISCALI_TEST_MODE
        );
        console.log("=================================");

        const risultati = [];

        for (const prodotto of prodottiExcel) {

            const codice = String(
                prodotto.codice || ""
            ).trim();

            const descrizione = String(
                prodotto.descrizione || ""
            ).trim();

            const quantita = Number(
                prodotto.quantita || 0
            );

            // Ignora righe senza codice o quantità
            if (!codice || quantita <= 0) {
                continue;
            }

            console.log(
                `RICERCA: ${codice} - ${descrizione} - QTA ${quantita}`
            );

            const ricerca =
                await tiscali.cercaProdottoTiscali(
                    codice
                );

            if (
                ricerca.successo &&
                ricerca.productId
            ) {

                risultati.push({

                    codice: codice,

                    descrizione: descrizione,

                    quantita: quantita,

                    productId:
                        String(ricerca.productId),

                    trovato: true,

                    aggiuntaSimulata: true

                });

            } else {

                risultati.push({

                    codice: codice,

                    descrizione: descrizione,

                    quantita: quantita,

                    productId: null,

                    trovato: false,

                    aggiuntaSimulata: false,

                    errore:
                        ricerca.errore ||
                        "Prodotto non trovato"

                });

            }

        }

        const trovati =
            risultati.filter(
                prodotto => prodotto.trovato
            );

        const nonTrovati =
            risultati.filter(
                prodotto => !prodotto.trovato
            );

        res.json({

            successo: true,

            modalitaTest:
                process.env.TISCALI_TEST_MODE === "true",

            numeroProdotti:
                risultati.length,

            prodottiTrovati:
                trovati.length,

            prodottiNonTrovati:
                nonTrovati.length,

            risultati: risultati

        });

    } catch (errore) {

        console.error(
            "ERRORE SIMULAZIONE ORDINE:",
            errore
        );

        res.status(500).json({

            successo: false,

            errore: errore.message

        });

    }

});
app.post("/invia-ordine-tiscali", async (req, res) => {

    try {

        const prodottiExcel = req.body.prodotti || [];

        if (
            !Array.isArray(prodottiExcel) ||
            prodottiExcel.length === 0
        ) {

            return res.status(400).json({
                successo: false,
                errore: "Nessun prodotto ricevuto"
            });

        }

        console.log("=================================");
        console.log("INVIO ORDINE REALE A TISCALI");
        console.log("=================================");

        // ==============================
        // 1. LOGIN
        // ==============================

        const login = await tiscali.loginTiscali(
            process.env.TISCALI_USERNAME,
            process.env.TISCALI_PASSWORD
        );

        console.log("LOGIN:", login);

        if (!login.successo) {

            return res.status(500).json({
                successo: false,
                fase: "login",
                login
            });

        }

        // ==============================
        // 2. ELABORIAMO SOLO I PRODOTTI
        //    CON QUANTITÀ > 0
        // ==============================

        const prodottiDaInviare =
            prodottiExcel.filter(
                prodotto =>
                    String(prodotto.codice || "").trim() &&
                    Number(prodotto.quantita || 0) > 0
            );

        console.log(
            "PRODOTTI DA INVIARE:",
            prodottiDaInviare.length
        );

        const risultati = [];

        // ==============================
        // 3. RICERCA + AGGIUNTA
        // ==============================

        for (const prodotto of prodottiDaInviare) {

            const codice =
                String(prodotto.codice || "").trim();

            const descrizione =
                String(prodotto.descrizione || "").trim();

            const quantita =
                Number(prodotto.quantita || 0);

            console.log("---------------------------------");
            console.log("CODICE:", codice);
            console.log("DESCRIZIONE:", descrizione);
            console.log("QUANTITÀ:", quantita);

            // CERCA PRODOTTO

            const ricerca =
                await tiscali.cercaProdottoTiscali(codice);

            console.log(
                "RICERCA:",
                ricerca
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

            console.log(
                "PRODUCT ID:",
                productId
            );

            // AGGIUNGI AL CARRELLO

            const aggiunta =
                await tiscali.aggiungiAlCarrelloTiscali(
                    productId,
                    quantita,
                    login.token
                );

            console.log(
                "AGGIUNTA:",
                aggiunta
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

                risultatoAggiunta:
                    aggiunta

            });

        }

        // ==============================
        // 4. RISULTATO
        // ==============================

        const aggiunti =
            risultati.filter(
                prodotto => prodotto.aggiunto
            );

        const nonTrovati =
            risultati.filter(
                prodotto => !prodotto.trovato
            );

        const errori =
            risultati.filter(
                prodotto =>
                    prodotto.trovato &&
                    !prodotto.aggiunto
            );

        console.log("=================================");
        console.log("FINE INVIO TISCALI");
        console.log(
            "AGGIUNTI:",
            aggiunti.length
        );
        console.log(
            "NON TROVATI:",
            nonTrovati.length
        );
        console.log(
            "ERRORI:",
            errori.length
        );
        console.log("=================================");

        return res.json({

            successo:
                errori.length === 0 &&
                nonTrovati.length === 0,

            numeroProdotti:
                risultati.length,

            prodottiAggiunti:
                aggiunti.length,

            prodottiNonTrovati:
                nonTrovati.length,

            prodottiConErrore:
                errori.length,

            risultati:
                risultati

        });

    } catch (errore) {

        console.error(
            "ERRORE INVIO ORDINE TISCALI:",
            errore
        );

        return res.status(500).json({

            successo: false,
        

            errore:
                errore.message

        });

    }

});
app.post("/ordine/prodotto", (req, res) => {

    const {
    ordineId,
    codice,
    descrizione,
    quantita
} = req.body;


console.log(req.body);


    ordiniDatabase.aggiungiProdottoOrdine(
        ordineId,
        codice,
        descrizione,
        quantita,
        (err, risultato) => {

            if(err){

                res.json({
                    errore: err.message
                });

            } else {

                res.json({
                    aggiunto: risultato
                });

            }

        }
    );

});app.post("/ordine/apri", (req, res) => {


    const {
        puntoVenditaId
    } = req.body;


    ordiniDatabase.apriOrdine(
        puntoVenditaId,
        (err, idOrdine) => {


            if(err){

                res.json({
                    errore: err.message
                });

            } else {

                res.json({
                    ordineId: idOrdine
                });

            }


        }
    );


});
app.get("/ordine/:puntoVenditaId", (req, res) => {


    const id = req.params.puntoVenditaId;


    ordiniDatabase.getOrdineAperto(
        id,
        (err, ordine) => {


            if(err){

                res.json({
                    errore: err.message
                });

            } else {

                res.json(ordine);

            }


        }
    );


});
app.get("/aggiungi-prodotto-db", (req, res) => {


    ordiniDatabase.aggiungiProdottoOrdine(
        1,
        "2331/D",
        5,
        (err, idDettaglio) => {


            if(err){

                res.json({
                    errore: err.message
                });

            } else {

                res.json({
                    messaggio: "Prodotto aggiunto all'ordine",
                    idDettaglio: idDettaglio
                });

            }


        }
    );


});
app.get("/modifica-prodotto-db", (req, res) => {


    ordiniDatabase.modificaQuantitaOrdine(
        1,
        "2331/D",
        10,
        (err, risultato) => {


            if(err){

                res.json({
                    errore: err.message
                });

            } else {

                res.json({
                    modificati: risultato
                });

            }


        }
    );


});
app.get("/ordine-db", (req, res) => {


    ordiniDatabase.getOrdineAperto(
        1,
        (err, ordine) => {


            if(err){

                res.json({
                    errore: err.message
                });

            } else {

                res.json(ordine);

            }


        }
    );


});
app.post("/ordine/elimina-prodotto", (req, res) => {

    const { ordineId, codice } = req.body;


    ordiniDatabase.eliminaProdottoOrdine(
        ordineId,
        codice,
        (err, risultato) => {


            if(err){

                res.status(500).json({
                    errore: err.message
                });

            } else {

                res.json({
                    messaggio:"Prodotto eliminato",
                    eliminati: risultato
                });

            }


        }
    );

});
app.get("/ordine/riepilogo/:id", (req,res)=>{

    const ordineId = req.params.id;


    ordiniDatabase.getOrdine(
        ordineId,
        (err, ordine)=>{

            if(err){

                res.status(500).json({
                    errore: err.message
                });

            } else {

                res.json(ordine);

            }

        }
    );

});
app.get("/ordine/riepilogo/:id", (req,res)=>{

    const ordineId = req.params.id;


    ordiniDatabase.getOrdine(
        ordineId,
        (err, ordine)=>{


            if(err){

                res.status(500).json({
                    errore:err.message
                });

            } else {

                res.json(ordine);

            }


        }
    );

});
app.get("/test-axios", async (req, res) => {

    try {

        const risposta = await axios.get(
            "https://www.tiscaliformaggi.com/it/catalogo"
        );

        res.json({
            successo: true,
            status: risposta.status
        });

    } catch (err) {

        console.error(err.message);

        res.status(500).json({
            successo: false,
            errore: err.message
        });

    }

});
app.get("/test-config", (req, res) => {

    res.json({
        usernamePresente: !!process.env.TISCALI_USERNAME,
        passwordPresente: !!process.env.TISCALI_PASSWORD
    });

});
app.get("/test-tiscali", async (req, res) => {

    const risultato =
        await tiscali.testaTiscali();

    res.json(risultato);

});
app.get("/test-login-tiscali", async (req, res) => {

    const risultato =
        await tiscali.leggiPaginaLogin();

    res.json(risultato);

});
app.get("/test-funzione-login", (req, res) => {

    res.json({
        loginDisponibile:
            typeof tiscali.loginTiscali === "function"
    });

});
app.get("/leggi-carrello-tiscali", async (req, res) => {

    try {

        const username = process.env.TISCALI_USERNAME;
        const password = process.env.TISCALI_PASSWORD;

        const login = await tiscali.loginTiscali(
            username,
            password
        );

        if (!login.successo) {

            return res.json({
                successo: false,
                fase: "login",
                login
            });

        }

        const carrello =
            await tiscali.leggiCarrelloTiscali();

        res.json({
            successo: true,
            login,
            carrello
        });

    } catch (errore) {

        console.error(
            "ERRORE LETTURA CARRELLO:",
            errore
        );

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});
app.get("/test-minicart-tiscali", async (req, res) => {

    try {

        console.log("=================================");
        console.log("TEST MINICART TISCALI");
        console.log("=================================");

        const risultato =
            await tiscali.aggiornaMiniCartTiscali();

        console.log(
            "RISULTATO TEST MINICART:",
            risultato
        );

        res.json(risultato);

    } catch (errore) {

        console.error(
            "ERRORE TEST MINICART:",
            errore
        );

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});

const PORT = 3000;
app.get("/test-cart-reale", async (req, res) => {
    try {
        console.log("=================================");
        console.log("TEST CART/ADD REALE TISCALI");
        console.log("=================================");

        const risultatoLogin = await tiscali.loginTiscali(
            process.env.TISCALI_USERNAME,
            process.env.TISCALI_PASSWORD
        );

        console.log("RISULTATO LOGIN:");
        console.dir(risultatoLogin, { depth: null });

        if (!risultatoLogin.successo) {
            return res.status(500).json({
                successo: false,
                fase: "login",
                risultato: risultatoLogin
            });
        }

        console.log("LOGIN RIUSCITO");
        const cookieLogin = await jar.getCookieString(
    "https://www.tiscaliformaggi.com"
);

console.log("=================================");
console.log("COOKIE DOPO LOGIN:");
console.log(cookieLogin);
console.log("=================================");

        const prodotto = await tiscali.cercaProdottoTiscali("2025");

        console.log("RISULTATO RICERCA:");
        console.dir(prodotto, { depth: null });

        if (!prodotto.successo || !prodotto.productId) {
            return res.status(500).json({
                successo: false,
                fase: "ricerca_prodotto",
                risultato: prodotto
            });
        }

        console.log(
            "PRODUCT ID CHE USEREMO:",
            prodotto.productId
        );

        const aggiunta = await tiscali.aggiungiAlCarrelloTiscali(
            prodotto.productId,
            1
        );

        console.log("RISULTATO CART/ADD:");
        console.dir(aggiunta, { depth: null });

        return res.json({
            successo: true,
            login: risultatoLogin,
            prodotto: prodotto,
            aggiunta: aggiunta
        });

    } catch (errore) {

        console.error(
            "ERRORE TEST CART/ADD:",
            errore
        );

        return res.status(500).json({
            successo: false,
            errore: errore.message
        });
    }
});
app.get("/test-vino", async (req, res) => {
    try {

        console.log("=================================");
        console.log("TEST AGGIUNTA VINO");
        console.log("PRODUCT ID: 5863");
        console.log("QUANTITA: 3");
        console.log("=================================");

        const risultato =
            await tiscali.aggiungiAlCarrelloTiscali(5863, 3);

        console.log("RISULTATO TEST:");
        console.dir(risultato, { depth: null });

        res.json(risultato);

    } catch (errore) {

        console.error("ERRORE TEST VINO:", errore);

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }
});




app.get("/analizza-carrello-tiscali", async (req, res) => {

    const username = process.env.TISCALI_USERNAME;
    const password = process.env.TISCALI_PASSWORD;

    const login = await tiscali.loginTiscali(
        username,
        password
    );

    if (!login.successo) {
        return res.json({
            login
        });
    }

    const risultato =
        await tiscali.analizzaEliminazioneCarrelloTiscali();

    res.json({
        login,
        risultato
    });

});
   app.get("/elimina-ordine", (req, res) => {

    const ordine = ordini.eliminaProdotto(
        "2331/D"
    );

    res.json(ordine);

});
app.get("/test-login-reale", async (req, res) => {

    const username = process.env.TISCALI_USERNAME;
    const password = process.env.TISCALI_PASSWORD;

    if (!username || !password) {

        return res.status(500).json({
            successo: false,
            errore: "Credenziali Tiscali non configurate"
        });

    }

    const login =
        await tiscali.loginTiscali(
            username,
            password
        );

    if (!login.successo) {

        return res.json({
            login: login,
            sessione: false
        });

    }

    const sessione =
        await tiscali.verificaSessioneTiscali();

    res.json({
        login: login,
        sessione: sessione
    });

});
app.get("/test-cerca-prodotto", async (req, res) => {

    const username = process.env.TISCALI_USERNAME;
    const password = process.env.TISCALI_PASSWORD;

    const login =
        await tiscali.loginTiscali(
            username,
            password
        );

    if (!login.successo) {

        return res.json({
            login: login
        });

    }

    const risultato =
        await tiscali.cercaProdottoTiscali(
            "Z0005"
        );

    res.json({
        login: login,
        ricerca: risultato
    });

});
app.get("/test-carrello-tiscali", async (req, res) => {

    try {

        const username = process.env.TISCALI_USERNAME;
        const password = process.env.TISCALI_PASSWORD;

        if (!username || !password) {

            return res.status(500).json({
                successo: false,
                errore: "Credenziali Tiscali non configurate"
            });

        }

        console.log("=================================");
        console.log("TEST CARRELLO COMPLETO");
        console.log("=================================");

        // 1. LOGIN
        console.log("1. LOGIN TISCALI...");

        const login =
            await tiscali.loginTiscali(
                username,
                password
            );

        console.log("LOGIN:", login);

        if (!login.successo) {

            return res.json({
                successo: false,
                fase: "login",
                login
            });

        }

        // 2. CERCA PRODOTTO
        console.log("2. CERCA Z0005...");

        const ricerca =
            await tiscali.cercaProdottoTiscali(
                "Z0005"
            );

        console.log("RICERCA:", ricerca);

        if (!ricerca.successo || !ricerca.productId) {

            return res.json({
                successo: false,
                fase: "ricerca",
                login,
                ricerca
            });

        }

        // 3. AGGIUNGI AL CARRELLO
        console.log("3. AGGIUNTA AL CARRELLO...");

        const aggiunta =
            await tiscali.aggiungiAlCarrelloTiscali(
                ricerca.productId,
                1
            );

        console.log("AGGIUNTA:", aggiunta);

        // 4. LEGGI IL CARRELLO
        console.log("4. LETTURA CARRELLO...");

        const carrello =
            await tiscali.leggiCarrelloTiscali();

        console.log("CARRELLO:", carrello);

        res.json({

            successo: true,

            login: login,

            ricerca: ricerca,

            aggiunta: aggiunta,

            carrello: carrello

        });

    } catch (errore) {

        console.error(
            "ERRORE TEST CARRELLO:",
            errore
        );

        res.status(500).json({

            successo: false,

            errore: errore.message

        });

    }

});
app.get("/test-verifica-carrello", async (req, res) => {

    try {

        const risultato =
            await tiscali.verificaCarrelloTiscali();

        res.json(risultato);

    } catch (errore) {

        console.error(
            "Errore verifica carrello:",
            errore
        );

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});

app.post("/carrello/rimuovi", async (req, res) => {

    try {

        const { productId } = req.body;

        const risultato =
            await tiscali.rimuoviProdottoCarrelloTiscali(
                productId
            );

        res.json(risultato);

    } catch (errore) {

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});
app.post("/test-flusso-completo", async (req, res) => {

    try {

        const username = process.env.TISCALI_USERNAME;
        const password = process.env.TISCALI_PASSWORD;

        if (!username || !password) {
            return res.status(500).json({
                successo: false,
                errore: "Credenziali Tiscali non configurate"
            });
        }

        console.log("1. LOGIN TISCALI...");

        const login = await tiscali.loginTiscali(
            username,
            password
        );

        if (!login.successo) {
            return res.json({
                successo: false,
                fase: "login",
                login
            });
        }

        console.log("LOGIN OK");

        console.log("2. CERCO Z0005...");

        const ricerca =
            await tiscali.cercaProdottoTiscali("Z0005");

        console.log("RICERCA:", ricerca);

        if (!ricerca.successo || !ricerca.productId) {

            return res.json({
                successo: false,
                fase: "ricerca",
                login,
                ricerca
            });

        }

        console.log(
            "PRODUCT ID:",
            ricerca.productId
        );

        console.log("3. AGGIUNGO AL CARRELLO...");

        const aggiunta =
            await tiscali.aggiungiAlCarrelloTiscali(
                ricerca.productId,
                1
            );

        console.log(
            "AGGIUNTA:",
            aggiunta
        );

        console.log("4. VERIFICO IL CARRELLO...");

        const carrello =
            await tiscali.verificaCarrelloTiscali();

        console.log(
            "CARRELLO:",
            carrello
        );

        res.json({

            successo: true,

            login: login,

            ricerca: ricerca,

            aggiunta: aggiunta,

            carrello: carrello

        });

    } catch (errore) {

        console.error(
            "ERRORE FLUSSO COMPLETO:",
            errore
        );

        res.status(500).json({

            successo: false,

            errore: errore.message

        });

    }

});
app.post("/cerca-prodotti-excel", async (req, res) => {

    try {

        const prodottiExcel = req.body.prodotti || [];

        if (!Array.isArray(prodottiExcel) || prodottiExcel.length === 0) {

            return res.status(400).json({
                successo: false,
                errore: "Nessun prodotto ricevuto"
            });

        }

        const risultati = [];

        for (const prodotto of prodottiExcel) {

            const codice = String(prodotto.codice || "").trim();

            if (!codice) {
                continue;
            }

            console.log(
                "RICERCA PRODOTTO EXCEL:",
                codice
            );

            const risultato =
                await tiscali.cercaProdottoTiscali(codice);

            risultati.push({

                codice: codice,

                descrizione:
                    prodotto.descrizione || "",

                unita:
                    prodotto.unita || "",

                quantita:
                    Number(prodotto.quantita) || 0,

                trovato:
                    risultato.prodottoTrovato || false,

                productId:
                    risultato.productId || null

            });

        }

        res.json({

            successo: true,

            numeroProdotti:
                risultati.length,

            risultati: risultati

        });

    } catch (errore) {

        console.error(
            "ERRORE CERCA PRODOTTI EXCEL:",
            errore
        );

        res.status(500).json({

            successo: false,

            errore: errore.message

        });

    }

});
app.post("/simula-ordine-excel", async (req, res) => {

    try {

        const prodottiExcel = req.body.prodotti || [];

        if (!Array.isArray(prodottiExcel) || prodottiExcel.length === 0) {

            return res.status(400).json({
                successo: false,
                errore: "Nessun prodotto ricevuto"
            });

        }

        const risultati = [];

        console.log("=================================");
        console.log("SIMULAZIONE ORDINE EXCEL");
        console.log("Numero prodotti:", prodottiExcel.length);
        console.log("=================================");

        for (const prodotto of prodottiExcel) {

            const codice = String(
                prodotto.codice || ""
            ).trim();

            const descrizione = String(
                prodotto.descrizione || ""
            ).trim();

            const unita = String(
                prodotto.unita || ""
            ).trim();

            const quantita = Number(
                prodotto.quantita
            ) || 0;

            if (!codice || quantita <= 0) {
                continue;
            }

            console.log(
                "Ricerca:",
                codice,
                "| Quantità:",
                quantita
            );

            const ricerca =
                await tiscali.cercaProdottoTiscali(codice);

            risultati.push({

                codice: codice,

                descrizione: descrizione,

                unita: unita,

                quantita: quantita,

                trovato:
                    ricerca.prodottoTrovato || false,

                productId:
                    ricerca.productId || null,

                simulato: true,

                carrelloModificato: false

            });

        }

        const trovati = risultati.filter(
            prodotto => prodotto.trovato
        );

        const nonTrovati = risultati.filter(
            prodotto => !prodotto.trovato
        );

        res.json({

            successo: true,

            modalitaTest: true,

            carrelloModificato: false,

            numeroProdotti: risultati.length,

            prodottiTrovati: trovati.length,

            prodottiNonTrovati: nonTrovati.length,

            risultati: risultati

        });

    } catch (errore) {

        console.error(
            "ERRORE SIMULAZIONE ORDINE:",
            errore
        );

        res.status(500).json({

            successo: false,

            errore: errore.message

        });

    }

});
app.post("/test-excel-reale", async (req, res) => {

    try {

        const prodotto = req.body.prodotto;

        if (!prodotto) {

            return res.status(400).json({
                successo: false,
                errore: "Nessun prodotto ricevuto"
            });

        }

        const codice = String(
            prodotto.codice || ""
        ).trim();

        const descrizione = String(
            prodotto.descrizione || ""
        ).trim();

        const quantita = Number(
            prodotto.quantita || 0
        );

        if (!codice || quantita <= 0) {

            return res.status(400).json({
                successo: false,
                errore: "Codice o quantità non validi"
            });

        }

        console.log("=================================");
        console.log("TEST EXCEL → TISCALI REALE");
        console.log("CODICE:", codice);
        console.log("DESCRIZIONE:", descrizione);
        console.log("QUANTITÀ:", quantita);
        console.log("=================================");


        // ==============================
        // 1. LOGIN
        // ==============================

        const login =
            await tiscali.loginTiscali(
                process.env.TISCALI_USERNAME,
                process.env.TISCALI_PASSWORD
            );

        console.log("LOGIN:", login);

        if (!login.successo) {

            return res.status(500).json({
                successo: false,
                fase: "login",
                login
            });

        }


        // ==============================
        // 2. CERCA PRODOTTO
        // ==============================

        const ricerca =
            await tiscali.cercaProdottoTiscali(
                codice
            );

        console.log("RICERCA:", ricerca);

        if (
            !ricerca.successo ||
            !ricerca.productId
        ) {

            return res.status(404).json({

                successo: false,

                fase: "ricerca_prodotto",

                ricerca

            });

        }


        console.log(
            "PRODUCT ID TROVATO:",
            ricerca.productId
        );


        // ==============================
        // 3. AGGIUNGI AL CARRELLO
        // ==============================

        const aggiunta =
            await tiscali.aggiungiAlCarrelloTiscali(
                ricerca.productId,
                quantita
            );

        console.log(
            "AGGIUNTA:",
            aggiunta
        );


        // ==============================
        // 4. RISULTATO
        // ==============================

        return res.json({

            successo:
                aggiunta.successo,

            codice:
                codice,

            descrizione:
                descrizione,

            quantita:
                quantita,

            productId:
                ricerca.productId,

            aggiunta:
                aggiunta

        });


    } catch (errore) {

        console.error(
            "ERRORE TEST EXCEL REALE:",
            errore
        );

        return res.status(500).json({

            successo: false,

            errore:
                errore.message

        });

    }

});
app.get("/controlla-carrello", async (req, res) => {

    try {

        const username = process.env.TISCALI_USERNAME;
        const password = process.env.TISCALI_PASSWORD;

        console.log("=================================");
        console.log("CONTROLLO CARRELLO TISCALI");
        console.log("=================================");

        const login = await tiscali.loginTiscali(
            username,
            password
        );

        console.log("LOGIN:", login);

        if (!login.successo) {

            return res.status(500).json({
                successo: false,
                fase: "login",
                login
            });

        }

        const carrello =
            await tiscali.leggiCarrelloTiscali();

        console.log("CARRELLO REALE:");
        console.dir(carrello, { depth: null });

        res.json({
            successo: true,
            carrello: carrello
        });

    } catch (errore) {

        console.error(
            "ERRORE CONTROLLO CARRELLO:",
            errore
        );

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});
app.post("/test-excel-vino", async (req, res) => {

    try {

        const prodotto = {
            codice: "5710",
            descrizione: "VINO SANGIOVESE FOULA' CANT.PAULI'S CL 75 (6BT/CT)",
            quantita: 3
        };

        console.log("=================================");
        console.log("TEST EXCEL -> TISCALI");
        console.log("CODICE:", prodotto.codice);
        console.log("QUANTITA:", prodotto.quantita);
        console.log("=================================");

        // 1. LOGIN
        const login = await tiscali.loginTiscali(
            process.env.TISCALI_USERNAME,
            process.env.TISCALI_PASSWORD
        );

        console.log("LOGIN:", login);

        if (!login.successo) {

            return res.status(500).json({
                successo: false,
                fase: "login",
                login
            });

        }

        // 2. CERCA IL CODICE DELL'EXCEL
        const ricerca =
            await tiscali.cercaProdottoTiscali(
                prodotto.codice
            );

        console.log("RICERCA:", ricerca);

        if (!ricerca.successo || !ricerca.productId) {

            return res.status(500).json({
                successo: false,
                fase: "ricerca",
                ricerca
            });

        }

        console.log(
            "PRODUCT ID TROVATO:",
            ricerca.productId
        );

        // 3. AGGIUNGI AL CARRELLO
        const aggiunta =
            await tiscali.aggiungiAlCarrelloTiscali(
                ricerca.productId,
                prodotto.quantita
            );

        console.log("AGGIUNTA:", aggiunta);

        // 4. RISPOSTA
        res.json({

            successo: true,

            codice: prodotto.codice,

            descrizione: prodotto.descrizione,

            quantita: prodotto.quantita,

            productId: ricerca.productId,

            aggiunta: aggiunta

        });

    } catch (errore) {

        console.error(
            "ERRORE TEST EXCEL VINO:",
            errore
        );

        res.status(500).json({

            successo: false,

            errore: errore.message

        });

    }

});
app.post("/test-due-prodotti-reali", async (req, res) => {

    try {

        const prodotti = [
            {
                codice: "5710",
                descrizione: "VINO SANGIOVESE",
                quantita: 2
            },
            {
                codice: "Z0005",
                descrizione: "PRODOTTO Z0005",
                quantita: 1
            }
        ];

        console.log("=================================");
        console.log("TEST 2 PRODOTTI REALI");
        console.log("=================================");

        // 1. LOGIN
        const login = await tiscali.loginTiscali(
            process.env.TISCALI_USERNAME,
            process.env.TISCALI_PASSWORD
        );

        console.log("LOGIN:", login);

        if (!login.successo) {

            return res.status(500).json({
                successo: false,
                fase: "login",
                login
            });

        }

        const risultati = [];

        // 2. CERCA E AGGIUNGE I PRODOTTI
        for (const prodotto of prodotti) {

            console.log("---------------------------------");
            console.log("CODICE:", prodotto.codice);
            console.log("QUANTITA:", prodotto.quantita);

            const ricerca =
                await tiscali.cercaProdottoTiscali(
                    prodotto.codice
                );

            console.log("RICERCA:", ricerca);

            if (!ricerca.successo || !ricerca.productId) {

                risultati.push({
                    ...prodotto,
                    trovato: false,
                    aggiunto: false,
                    errore: "Prodotto non trovato"
                });

                continue;
            }

            const aggiunta =
                await tiscali.aggiungiAlCarrelloTiscali(
                    ricerca.productId,
                    prodotto.quantita
                );

            console.log("AGGIUNTA:", aggiunta);

            risultati.push({
                ...prodotto,
                trovato: true,
                productId: ricerca.productId,
                aggiunto: aggiunta.successo,
                risultato: aggiunta
            });

        }

        // 3. LEGGIAMO IL CARRELLO UNA SOLA VOLTA
        console.log("=================================");
        console.log("VERIFICA FINALE CARRELLO");
        console.log("=================================");

        const carrello =
            await tiscali.leggiCarrelloTiscali();

        console.dir(carrello, { depth: null });

        res.json({
            successo: true,
            risultati,
            carrello
        });

    } catch (errore) {

        console.error(
            "ERRORE TEST 2 PRODOTTI:",
            errore
        );

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }

});
app.get("/test-vino-verifica", async (req, res) => {
    try {

        console.log("=================================");
        console.log("TEST VINO + VERIFICA CARRELLO");
        console.log("=================================");

        // 1. LOGIN
        const login = await tiscali.loginTiscali(
            process.env.TISCALI_USERNAME,
            process.env.TISCALI_PASSWORD
        );

        console.log("LOGIN:", login);

        if (!login.successo) {
            return res.json({
                successo: false,
                fase: "login",
                login
            });
        }

        // 2. AGGIUNTA VINO
        console.log("AGGIUNGO VINO 5863 - QTA 3");

        const aggiunta =
            await tiscali.aggiungiAlCarrelloTiscali(
                5863,
                3
            );

        console.log("AGGIUNTA:", aggiunta);

        // 3. LETTURA IMMEDIATA DEL CARRELLO
        console.log("LEGGO IL CARRELLO...");

        const carrello =
            await tiscali.leggiCarrelloTiscali();

        console.log("CARRELLO:");
        console.dir(carrello, { depth: null });

        res.json({
            successo: true,
            login: login,
            aggiunta: aggiunta,
            carrello: carrello
        });

    } catch (errore) {

        console.error(
            "ERRORE TEST VINO + CARRELLO:",
            errore
        );

        res.status(500).json({
            successo: false,
            errore: errore.message
        });

    }
});app.post("/ordine-tiscali", async (req, res) => {

    try {

        const prodottiExcel = req.body.prodotti || [];

        if (
            !Array.isArray(prodottiExcel) ||
            prodottiExcel.length === 0
        ) {

            return res.status(400).json({
                successo: false,
                errore: "Nessun prodotto ricevuto"
            });

        }

        console.log("=================================");
        console.log("ORDINE REALE → TISCALI");
        console.log("PRODOTTI:", prodottiExcel.length);
        console.log("=================================");


        // =================================
        // 1. LOGIN
        // =================================

        const login =
            await tiscali.loginTiscali(
                process.env.TISCALI_USERNAME,
                process.env.TISCALI_PASSWORD
            );

        console.log("LOGIN:", login);

        if (!login.successo) {

            return res.status(500).json({

                successo: false,

                fase: "login",

                login

            });

        }


        // =================================
        // 2. PREPARIAMO RISULTATI
        // =================================

        const risultati = [];


        // =================================
        // 3. PROCESSIAMO OGNI PRODOTTO
        // =================================

        for (const prodotto of prodottiExcel) {

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


            // Ignora righe non valide

            if (!codice || quantita <= 0) {

                console.log(
                    "RIGA IGNORATA:",
                    prodotto
                );

                continue;

            }


            console.log("=================================");
            console.log("PRODOTTO:", codice);
            console.log("DESCRIZIONE:", descrizione);
            console.log("QUANTITÀ:", quantita);
            console.log("=================================");


            // =================================
            // 3A. CERCA PRODOTTO
            // =================================

            const ricerca =
                await tiscali.cercaProdottoTiscali(
                    codice
                );

            console.log(
                "RICERCA:",
                ricerca
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


            // =================================
            // 3B. AGGIUNGI AL CARRELLO
            // =================================

            const aggiunta =
                await tiscali.aggiungiAlCarrelloTiscali(
                    ricerca.productId,
                    quantita
                );


            console.log(
                "AGGIUNTA:",
                aggiunta
            );


            risultati.push({

                codice,

                descrizione,

                quantita,

                trovato: true,

                aggiunto:
                    aggiunta.successo === true,

                productId:
                    ricerca.productId,

                errore:
                    aggiunta.successo
                        ? null
                        : aggiunta.errore || "Errore aggiunta"

            });

        }


        // =================================
        // 4. RIEPILOGO
        // =================================

        const aggiunti =
            risultati.filter(
                prodotto => prodotto.aggiunto
            );

        const errori =
            risultati.filter(
                prodotto => !prodotto.aggiunto
            );


        console.log("=================================");
        console.log("FINE ORDINE TISCALI");
        console.log(
            "AGGIUNTI:",
            aggiunti.length
        );
        console.log(
            "ERRORI:",
            errori.length
        );
        console.log("=================================");


        return res.json({

            successo:
                errori.length === 0,

            numeroProdotti:
                risultati.length,

            prodottiAggiunti:
                aggiunti.length,

            prodottiConErrore:
                errori.length,

            risultati:
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

app.listen(PORT, () => {
    console.log(
        `Server avviato sulla porta ${PORT}`
    );
});
