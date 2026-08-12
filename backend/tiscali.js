const cheerio = require("cheerio");
const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

const jar = new CookieJar();

const tiscali = wrapper(
    axios.create({
        jar,
        withCredentials: true,
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36"
        }
    })
);

async function testaTiscali() {

    try {

        const risposta = await tiscali.get(
            "https://www.tiscaliformaggi.com/it/catalogo"
        );

        console.log(
            "Tiscali raggiunto:",
            risposta.status
        );

        return {
            successo: true,
            status: risposta.status
        };

    } catch (errore) {

        console.error(
            "Errore Tiscali:",
            errore.message
        );

        return {
            successo: false,
            errore: errore.message
        };


    }

}
async function leggiPaginaLogin() {

    try {

        const risposta = await tiscali.get(
            "https://www.tiscaliformaggi.com/it/accesso"
        );

        const $ = cheerio.load(risposta.data);

        const form = $("form").first();

        const action = form.attr("action") || "";
        const method = form.attr("method") || "";

        const campi = [];

        form.find("input").each((i, elemento) => {

            campi.push({
                name: $(elemento).attr("name") || "",
                type: $(elemento).attr("type") || "",
                value: $(elemento).attr("value") || ""
            });

        });

        console.log("FORM LOGIN");
        console.log("Action:", action);
        console.log("Method:", method);
        console.log("Campi:", campi);




        const html = risposta.data;
console.log(
    "DATA-ENTRYID NELL'HTML:",
    (html.match(/data-entryid=/g) || []).length
);

console.log(
    "8543 PRESENTE:",
    html.includes('data-entryid="8543"')
);

        const posizioneToken =
            html.indexOf("__RequestVerificationToken");

        console.log(
            "Token presente nell'HTML:",
            posizioneToken !== -1
        );

        if (posizioneToken !== -1) {

            console.log(
                "Posizione token:",
                posizioneToken
            );

        }


        return {

            successo: true,
            status: risposta.status,
            action,
            method,
            campi

        };


    } catch (errore) {

        console.error(
            "Errore pagina login:",
            errore.message
        );

        return {

            successo: false,
            errore: errore.message

        };

    }

}
async function loginTiscali(username, password) {

    try {

        console.log("=== INIZIO LOGIN TISCALI ===");

        console.log("1. GET PAGINA LOGIN");

        const pagina = await tiscali.get(
            "https://www.tiscaliformaggi.com/it/accesso"
        );

        console.log(
            "GET LOGIN STATUS:",
            pagina.status
        );

        console.log(
            "GET LOGIN URL:",
            pagina.request?.res?.responseUrl || "non disponibile"
        );

        const html = pagina.data;

        const match = html.match(
            /__RequestVerificationToken[^>]*value=["']([^"']+)["']/i
        );

        console.log(
            "TOKEN TROVATO:",
            !!match
        );

        if (!match) {

            return {
                successo: false,
                errore: "Token CSRF non trovato"
            };

        }

        const token = match[1];

        console.log(
            "TOKEN LUNGHEZZA:",
            token.length
        );

        const dati = new URLSearchParams();

        dati.append("username", username);
        dati.append("password", password);
        dati.append("form_sent", "login");
        dati.append("pageToredirect", "319");
        dati.append("pageToredirectBuy", "317");
        dati.append("pagePopup", "False");
        dati.append("enablePageRedirectForAll", "0");
        dati.append("_pageId", "306");
        dati.append("_componentId", "1265");

        dati.append(
            "__RequestVerificationToken",
            token
        );

        console.log("2. POST LOGIN");

        console.log(
            "URL:",
            "https://www.tiscaliformaggi.com/Async/SubmitForm"
        );

        const risposta = await tiscali.post(
            "https://www.tiscaliformaggi.com/Async/SubmitForm",
            dati.toString(),
            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded; charset=UTF-8",

                    "X-Requested-With":
                        "XMLHttpRequest",

                    "Referer":
                        "https://www.tiscaliformaggi.com/it/accesso",

                    "Origin":
                        "https://www.tiscaliformaggi.com"
                },

                validateStatus: () => true
            }
        );

        console.log(
            "LOGIN RESPONSE STATUS:",
            risposta.status
        );

        console.log(
            "LOGIN RESPONSE URL:",
            risposta.request?.res?.responseUrl || "non disponibile"
        );

        console.log(
            "LOGIN RESPONSE DATA:"
        );

        console.log(
            risposta.data
        );

        console.log(
            "COOKIE DOPO LOGIN:"
        );

        console.log(
            "=== HEADER LOGIN ==="
        );

        console.dir(
            risposta.headers,
            { depth: null }
        );

        console.log(
            "=== SET-COOKIE LOGIN ==="
        );

        console.dir(
            risposta.headers["set-cookie"],
            { depth: null }
        );

        console.log(
            await jar.getCookieString(
                "https://www.tiscaliformaggi.com"
            )
        );

        if (risposta.status !== 200) {

            return {
                successo: false,

                status: risposta.status,

                errore:
                    "Il server Tiscali ha restituito HTTP " +
                    risposta.status,

                risposta: risposta.data
            };

        }

        console.log(
            "=== LOGIN COMPLETATO ==="
        );

        return {

            successo: true,

            status: risposta.status,

            token: token,

            returnedCode:
                risposta.data?.returnedCode || null,

            returnedError:
                risposta.data?.returnedError || null,

            location:
                risposta.data?.location || null,

            dataPresente:
                !!risposta.data?.data

        };

    } catch (errore) {

        console.error(
            "=== ERRORE LOGIN TISCALI ==="
        );

        console.error(
            "MESSAGGIO:",
            errore.message
        );

        console.error(
            "URL:",
            errore.config?.url
        );

        console.error(
            "METODO:",
            errore.config?.method
        );

        console.error(
            "STATUS:",
            errore.response?.status
        );

        console.error(
            "DATA:",
            errore.response?.data
        );

        return {

            successo: false,

            errore: errore.message,

            url:
                errore.config?.url || null,

            status:
                errore.response?.status || null

        };

    }

}
async function cercaProdottoTiscali(codice) {

    try {

        const paginaCatalogo = await tiscali.get(
            "https://www.tiscaliformaggi.com/it/catalogo"
        );

        const matchToken = paginaCatalogo.data.match(
            /__RequestVerificationToken[^>]*value=["']([^"']+)["']/i
        );

        const tokenCatalogo = matchToken
            ? matchToken[1]
            : null;

        console.log(
            "Token catalogo trovato:",
            !!tokenCatalogo
        );

        // ==============================
        // 1. EXECUTE FILTER
        // ==============================

        const dati = new URLSearchParams();

        dati.append("_pageId", "315");
        dati.append("_pageType", "page");
        dati.append("_filterId", "1469");
        dati.append(
            "_filters",
            `codice=${codice}&titolo=`
        );
        dati.append(
            "_location",
            "/it/catalogo"
        );
        dati.append("_cascaded", "true");
        dati.append(
            "_filtersFields",
            "codice=autocomplete&titolo=autocomplete"
        );

        if (tokenCatalogo) {
            dati.append(
                "__RequestVerificationToken",
                tokenCatalogo
            );
        }

        console.log(
            "DATI INVIATI EXECUTEFILTER:"
        );

        console.log(
            dati.toString().replace(
                /__RequestVerificationToken=[^&]+/,
                "__RequestVerificationToken=TOKEN"
            )
        );

        const risposta = await tiscali.post(
            "https://www.tiscaliformaggi.com/Async/Filter/ExecuteFilter",
            dati.toString(),
            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    "X-Requested-With":
                        "XMLHttpRequest",
                    "Referer":
                        "https://www.tiscaliformaggi.com/it/catalogo",
                    "Origin":
                        "https://www.tiscaliformaggi.com"
                }
            }
        );

        console.log(
            "STATUS EXECUTEFILTER:",
            risposta.status
        );

        console.log(
            "RISPOSTA EXECUTEFILTER:",
            risposta.data
        );

        // ==============================
        // 2. REFRESH FILTRI 1469
        // ==============================

        const refreshDati = new URLSearchParams();

        refreshDati.append("_pageId", "315");
        refreshDati.append("_pageType", "page");
        refreshDati.append("_componentId", "1469");

        if (tokenCatalogo) {
            refreshDati.append(
                "__RequestVerificationToken",
                tokenCatalogo
            );
        }

        console.log(
            "DATI INVIATI REFRESH FILTRI:"
        );

        console.log(
            refreshDati.toString().replace(
                /__RequestVerificationToken=[^&]+/,
                "__RequestVerificationToken=TOKEN"
            )
        );

        const rispostaRefresh = await tiscali.post(
            "https://www.tiscaliformaggi.com/Async/RefreshComponent",
            refreshDati.toString(),
            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    "X-Requested-With":
                        "XMLHttpRequest",
                    "Referer":
                        "https://www.tiscaliformaggi.com/it/catalogo",
                    "Origin":
                        "https://www.tiscaliformaggi.com"
                }
            }
        );

        console.log(
            "RISPOSTA REFRESH FILTRI:"
        );

        console.log(
            rispostaRefresh.data
        );

        // ==============================
        // 3. REFRESH RISULTATI 1493
        // ==============================

        const risultatiDati = new URLSearchParams();

        risultatiDati.append("_pageId", "315");
        risultatiDati.append("_pageType", "page");
        risultatiDati.append("_componentId", "1493");

        if (tokenCatalogo) {
            risultatiDati.append(
                "__RequestVerificationToken",
                tokenCatalogo
            );
        }

        console.log(
            "DATI INVIATI REFRESH RISULTATI:"
        );

        console.log(
            risultatiDati.toString().replace(
                /__RequestVerificationToken=[^&]+/,
                "__RequestVerificationToken=TOKEN"
            )
        );

        const rispostaRisultati = await tiscali.post(
            "https://www.tiscaliformaggi.com/Async/RefreshComponent",
            risultatiDati.toString(),
            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    "X-Requested-With":
                        "XMLHttpRequest",
                    "Referer":
                        "https://www.tiscaliformaggi.com/it/catalogo",
                    "Origin":
                        "https://www.tiscaliformaggi.com"
                }
            }
        );

        console.log(
            "RISPOSTA REFRESH RISULTATI:"
        );

        console.log(
            rispostaRisultati.data
        );

        console.log(
            "FINE RISPOSTA REFRESH RISULTATI"
        );

        // ==============================
// 4. CERCA PRODOTTO NEL RISULTATO
// ==============================

const html =
    rispostaRisultati.data?.data || "";

console.log(
    "LUNGHEZZA HTML RISULTATI:",
    html.length
);

// ANALISI DEL BLOCCO PRODOTTO
console.log("=================================");
console.log("ANALISI HTML PRODOTTO");
console.log("CODICE:", codice);
console.log("=================================");

const posAdd = html.indexOf("/Async/Cart/Add");

if (posAdd !== -1) {

    const inizio = Math.max(0, posAdd - 1500);
    const fine = Math.min(
        html.length,
        posAdd + 3000
    );

    console.log(
        html.substring(inizio, fine)
    );

} else {

    console.log(
        "NESSUN /Async/Cart/Add TROVATO NELL'HTML"
    );

}

const $risultati = cheerio.load(html);

console.log("=================================");
console.log("ELEMENTI CON DATA-ENTRYID");
console.log("=================================");

$risultati("[data-entryid]").each((i, elemento) => {

    console.log(
        "ELEMENTO:",
        i
    );

    console.log(
        "HTML ELEMENTO:",
        $risultati.html(elemento)
    );

});
// =================================
// CERCA IL PRODOTTO CORRETTO
// =================================

let prodottoElemento = null;
let productId = null;
let entryId = null;

$risultati("[data-action='addtocart']").each(
    (i, elemento) => {

        const id =
            $risultati(elemento).attr("data-productid");

        if (!id) {
            return;
        }

        // Cerchiamo il contenitore del prodotto
        const contenitore =
            $risultati(elemento)
                .closest(".ContainerRowComp");

        const testo =
            contenitore
                .text()
                .replace(/\s+/g, " ")
                .trim();

        if (
            testo.includes(codice)
        ) {

            prodottoElemento =
                contenitore;

            productId =
                id;

            return false;
        }

    }
);


// =================================
// CODICE / DESCRIZIONE
// =================================

let codiceTrovato = "";
let descrizioneTrovata = "";

if (prodottoElemento) {

    const testo =
        prodottoElemento
            .text()
            .replace(/\s+/g, " ")
            .trim();

    if (testo.includes(codice)) {

        codiceTrovato =
            codice;

    }

    const titolo =
        prodottoElemento
            .find(".titoloArticolo")
            .first()
            .text()
            .replace(/\s+/g, " ")
            .trim();

    descrizioneTrovata =
        titolo;

}


// =================================
// ENTRY ID
// =================================

if (prodottoElemento) {

    const elementoEntry =
        prodottoElemento
            .find("[data-entryid]")
            .first();

    if (elementoEntry.length) {

        entryId =
            elementoEntry.attr("data-entryid") ||
            null;

    }

}


// =================================
// LOG
// =================================

console.log(
    "PRODUCT ID TROVATO:",
    productId
);

console.log(
    "ENTRY ID TROVATO:",
    entryId
);

console.log(
    "CODICE RICHIESTO:",
    codice
);

console.log(
    "CODICE TROVATO:",
    codiceTrovato
);

console.log(
    "DESCRIZIONE TROVATA:",
    descrizioneTrovata
);

console.log(
    "PRODOTTO TROVATO:",
    !!productId
);

return {

    successo: true,

    status:
        rispostaRisultati.status,

    codice:
        codice,

    prodottoTrovato:
        !!productId,

    productId:
        productId,

    entryId:
        entryId,

    codiceTrovato:
        codiceTrovato,

    descrizioneTrovata:
        descrizioneTrovata

};

    } catch (errore) {

       console.error(
    "ERRORE CERCA PRODOTTO:",
    errore.message
);

console.error(
    "URL ERRORE:",
    errore.config?.url
);

console.error(
    "METODO ERRORE:",
    errore.config?.method
);

console.error(
    "STATUS ERRORE:",
    errore.response?.status
);

console.error(
    "RISPOSTA ERRORE:",
    errore.response?.data
);

        return {

            successo: false,
            codice: codice,
            errore: errore.message

        };

    }

}

async function aggiungiAlCarrelloTiscali(productId, quantita) {

    try {

        console.log("=================================");
        console.log("AGGIUNTA CARRELLO");
        console.log("PRODUCT ID:", productId);
        console.log("QUANTITA:", quantita);
        console.log(
            "TEST MODE:",
            process.env.TISCALI_TEST_MODE
        );
        console.log("=================================");

        // ==============================
        // CONTROLLO PRODUCT ID
        // ==============================

        if (!productId) {

            return {
                successo: false,
                errore: "Product ID mancante"
            };

        }

        // ==============================
        // MODALITÀ TEST
        // ==============================

        if (process.env.TISCALI_TEST_MODE === "true") {

            console.log(
                "MODALITÀ TEST: carrello NON modificato"
            );

            return {

                successo: true,

                modalitaTest: true,

                carrelloModificato: false,

                entryId:
                    String(productId),

                quantita:
                    Number(quantita),

                messaggio:
                    "Prodotto simulato: nessuna modifica al carrello Tiscali"

            };

        }

        // ==============================
        // PAGINA CATALOGO
        // ==============================

        console.log("GET PAGINA CATALOGO");

        const paginaCatalogo =
            await tiscali.get(
                "https://www.tiscaliformaggi.com/it/catalogo"
            );

        console.log(
            "STATUS PAGINA CATALOGO:",
            paginaCatalogo.status
        );

        // ==============================
        // TOKEN CSRF
        // ==============================

        const matchToken =
            paginaCatalogo.data.match(
                /__RequestVerificationToken[^>]*value=["']([^"']+)["']/i
            );

        const tokenCatalogo =
            matchToken
                ? matchToken[1]
                : null;

        if (!tokenCatalogo) {

            throw new Error(
                "Token CSRF carrello non trovato"
            );

        }

        console.log(
            "TOKEN CARRELLO TROVATO:",
            true
        );

        console.log(
            "TOKEN LUNGHEZZA:",
            tokenCatalogo.length
        );

        // ==============================
        // DATI CART/ADD
        // ==============================

        const dati =
            new URLSearchParams();

        dati.append(
            "_id",
            String(productId)
        );

        dati.append(
            "_quantity",
            String(quantita)
        );

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
            tokenCatalogo
        );

        console.log(
            "================================="
        );

        console.log(
            "INVIO POST /Async/Cart/Add"
        );

        console.log(
            "PRODUCT ID:",
            productId
        );

        console.log(
            "QUANTITÀ:",
            quantita
        );

        console.log(
            "DATI POST:",
            dati.toString().replace(
                /__RequestVerificationToken=[^&]+/,
                "__RequestVerificationToken=TOKEN"
            )
        );

        // ==============================
        // COOKIE PRIMA CART/ADD
        // ==============================

        console.log(
            "COOKIE PRIMA CART/ADD:"
        );

        const cookiePrima =
            await jar.getCookieString(
                "https://www.tiscaliformaggi.com"
            );

        console.log(
            cookiePrima
        );

        // ==============================
        // POST CART/ADD
        // ==============================

        const risposta =
            await tiscali.post(
                "https://www.tiscaliformaggi.com/Async/Cart/Add",
                dati.toString(),
                {

                    headers: {

                        "Content-Type":
                            "application/x-www-form-urlencoded; charset=UTF-8",

                        "X-Requested-With":
                            "XMLHttpRequest",

                        "Referer":
                            "https://www.tiscaliformaggi.com/it/catalogo",

                        "Origin":
                            "https://www.tiscaliformaggi.com"

                    },

                    validateStatus:
                        () => true

                }
            );

        console.log(
            "STATUS CART/ADD:",
            risposta.status
        );

        // ==============================
        // SET-COOKIE
        // ==============================

        console.log(
            "SET-COOKIE CART/ADD:"
        );

        console.log(
            risposta.headers["set-cookie"]
        );

        // ==============================
        // RISPOSTA CART/ADD
        // ==============================

        console.log(
            "RISPOSTA CART/ADD:"
        );

        console.dir(
            risposta.data,
            { depth: null }
        );

        // ==============================
        // COOKIE DOPO CART/ADD
        // ==============================

        console.log(
            "COOKIE DOPO CART/ADD:"
        );

        const cookieDopo =
            await jar.getCookieString(
                "https://www.tiscaliformaggi.com"
            );

        console.log(
            cookieDopo
        );

        console.log(
            "================================="
        );

        // ==============================
        // VERIFICA CARRELLO
        // ==============================

        console.log(
            "VERIFICA CARRELLO DOPO CART/ADD"
        );

        let verificaCarrello = null;

        try {

            verificaCarrello =
                await leggiCarrelloTiscali();

            console.log(
                "RISULTATO VERIFICA:"
            );

            console.dir(
                verificaCarrello,
                { depth: null }
            );

        } catch (erroreVerifica) {

            console.error(
                "ERRORE VERIFICA CARRELLO:"
            );

            console.error(
                erroreVerifica.message
            );

        }

        console.log(
            "================================="
        );

        console.log(
            "FINE VERIFICA CARRELLO"
        );

        console.log(
            "================================="
        );

        // ==============================
        // RISULTATO FINALE
        // ==============================

        return {

            successo:
                risposta.status >= 200 &&
                risposta.status < 300,

            modalitaTest:
                false,

            carrelloModificato:
                risposta.status >= 200 &&
                risposta.status < 300,

            status:
                risposta.status,

            entryId:
                String(productId),

            quantita:
                Number(quantita),

            risposta:
                risposta.data,

            verificaCarrello:
                verificaCarrello

        };

    } catch (errore) {

        // ==============================
        // ERRORE
        // ==============================

        console.error(
            "================================="
        );

        console.error(
            "ERRORE AGGIUNTA CARRELLO"
        );

        console.error(
            "================================="
        );

        console.error(
            "MESSAGGIO:",
            errore.message
        );

        console.error(
            "URL:",
            errore.config?.url
        );

        console.error(
            "METODO:",
            errore.config?.method
        );

        console.error(
            "STATUS:",
            errore.response?.status
        );

        console.error(
            "RISPOSTA:",
            errore.response?.data
        );

        console.error(
            "================================="
        );

        return {

            successo: false,

            modalitaTest: false,

            carrelloModificato: false,

            errore:
                errore.message,

            status:
                errore.response?.status || null,

            risposta:
                errore.response?.data || null

        };

    }

}

        
async function verificaCarrelloTiscali(productId, codice) {

    try {

        const risposta = await tiscali.get(
            "https://www.tiscaliformaggi.com/it/catalogo/carrello"
        );

        const html = risposta.data;


        console.log("=================================");
        console.log("VERIFICA CARRELLO TISCALI");
        console.log("STATUS:", risposta.status);
        console.log("PRODUCT ID CERCA:", productId);
        console.log("CODICE CERCA:", codice);
        console.log("LUNGHEZZA HTML:", html.length);
        console.log("=================================");


        const contieneProductId =
            html.includes(String(productId));


        const contieneCodice =
            html.includes(String(codice));


        console.log(
            "PRODUCT ID PRESENTE:",
            contieneProductId
        );


        console.log(
            "CODICE PRESENTE:",
            contieneCodice
        );


        if (contieneProductId) {

            const posizione =
                html.indexOf(
                    String(productId)
                );


            console.log(
                "HTML INTORNO AL PRODOTTO:"
            );


            console.log(
                html.substring(
                    Math.max(0, posizione - 500),
                    posizione + 1000
                )
            );

        }


        return {

            successo: true,

            status:
                risposta.status,

            productId,

            codice,

            productIdPresente:
                contieneProductId,

            codicePresente:
                contieneCodice,

            lunghezzaHTML:
                html.length

        };


    } catch (errore) {


        console.error(
            "ERRORE VERIFICA CARRELLO:",
            errore.message
        );


        return {

            successo: false,

            errore:
                errore.message

        };

    }

}


async function analizzaEliminazioneCarrelloTiscali(productId) {

    try {

        console.log("=================================");
        console.log("ANALISI RIMOZIONE CARRELLO");
        console.log("PRODUCT ID:", productId);
        console.log("=================================");

        const carrello = await leggiCarrelloTiscali();

        console.log("=== RISULTATO LETTURA CARRELLO ===");
        console.dir(carrello, { depth: null });

        if (!carrello.successo) {

            return {
                successo: false,
                errore: "Impossibile leggere il carrello"
            };

        }

        const prodotto = carrello.articoli.find(
            articolo =>
                articolo.productId === String(productId)
        );

        if (!prodotto) {

            console.log(
                "PRODOTTO NON TROVATO:",
                productId
            );

            return {

                successo: true,

                trovato: false,

                productId: String(productId),

                messaggio:
                    "Prodotto non presente nel carrello"

            };

        }

        console.log("PRODOTTO TROVATO:");
        console.dir(prodotto, { depth: null });

        return {

            successo: true,

            trovato: true,

            productId: String(productId),

            rowId: prodotto.rowId,

            quantita:
                prodotto.quantita

        };

    } catch (errore) {

        console.error(
            "ERRORE ANALISI CARRELLO:",
            errore.message
        );

        return {

            successo: false,

            errore: errore.message

        };

    }

}
function debugCookieTiscali() {
    try {
        const cookies = jar.getCookiesSync(
            "https://www.tiscaliformaggi.com"
        );

        console.log("=================================");
        console.log("COOKIE SESSIONE TISCALI");
        console.log("NUMERO COOKIE:", cookies.length);
        console.log("=================================");

        cookies.forEach((cookie, i) => {
            console.log(
                i + 1,
                cookie.key,
                "=",
                cookie.value
            );
        });

        return cookies.map(cookie => ({
            nome: cookie.key,
            valore: cookie.value
        }));

    } catch (errore) {

        console.error(
            "ERRORE LETTURA COOKIE:",
            errore.message
        );

        return [];
    }
}
async function verificaSessioneTiscali() {

    try {

        const risposta = await tiscali.get(
            "https://www.tiscaliformaggi.com/it/catalogo"
        );

        const html = risposta.data;

        const loginPresente =
            html.includes("Logout") ||
            html.includes("Esci") ||
            html.includes("logout");

        return {

            successo: true,
            status: risposta.status,
            paginaAccessibile: true,
            loginPresente: loginPresente,
            lunghezzaHTML: html.length

        };

    } catch (errore) {

        return {

            successo: false,
            errore: errore.message

        };

    }

}
     async function leggiCarrelloTiscali() {

    try {

        console.log("=================================");
        console.log("LETTURA COMPLETA CARRELLO TISCALI");
        console.log("=================================");

        const risposta = await tiscali.get(
            "https://www.tiscaliformaggi.com/it/catalogo/carrello",
            {
                headers: {
                    "Referer":
                        "https://www.tiscaliformaggi.com/it/catalogo/carrello"
                },
                validateStatus: () => true
            }
        );

        const html = risposta.data;

        console.log("STATUS CARRELLO:", risposta.status);

        console.log(
            "URL CARRELLO:",
            risposta.request?.res?.responseUrl || "non disponibile"
        );

        console.log(
            "LUNGHEZZA HTML:",
            typeof html === "string" ? html.length : 0
        );

        // =====================================================
        // VERIFICA CHE SIAMO ANCORA AUTENTICATI
        // =====================================================

        if (
            typeof html === "string" &&
            (
                html.includes("Username/Password errate") ||
                html.includes("<title>Accesso - Tiscali Formaggi</title>")
            )
        ) {

            console.log("⚠️ ATTENZIONE: TISCALI STA MOSTRANDO LA PAGINA LOGIN");

            return {

                successo: false,

                autenticato: false,

                status: risposta.status,

                errore:
                    "La sessione Tiscali non risulta autenticata",

                numeroArticoli: 0,

                articoli: []

            };

        }

        // =====================================================
        // ANALISI HTML
        // =====================================================

        const $ = cheerio.load(html);

        console.log("=================================");
        console.log("ANALISI HTML CARRELLO");
        console.log("=================================");

        console.log(
            "BUTTON PRODUCTID:",
            $("button[data-productid]").length
        );

        console.log(
            "DATA PRODUCTID:",
            $("[data-productid]").length
        );

        console.log(
            "DATA ENTRYID:",
            $("[data-entryid]").length
        );

        console.log(
            "DATA ROWID:",
            $("[data-rowid]").length
        );

        console.log(
            "Z0005 NELL'HTML:",
            html.includes("Z0005")
        );

        console.log(
            "PRODUCT ID 8549 NELL'HTML:",
            html.includes("8549")
        );

        console.log(
            "FORM. GRANA PADANO:",
            html.includes("FORM. GRANA PADANO")
        );

        console.log(
            "VINO SANGIOVESE:",
            html.includes("VINO SANGIOVESE")
        );

        // =====================================================
        // LETTURA MINICART
        // =====================================================

        const articoli = [];

        $(".ecMinicartComp-latestItemsOnCart > .d-flex").each(
            (i, elemento) => {

                const titolo =
                    $(elemento)
                        .find(".col-title a")
                        .attr("title") ||
                    $(elemento)
                        .find(".col-title a")
                        .text()
                        .trim() ||
                    null;

                const quantita =
                    $(elemento)
                        .find(".ecMinicartComp-itemQty")
                        .text()
                        .trim() ||
                    null;

                const rowId =
                    $(elemento)
                        .find("button[data-rowid]")
                        .attr("data-rowid") ||
                    null;

                const productId =
                    $(elemento)
                        .find("[data-productid]")
                        .attr("data-productid") ||
                    null;

                if (titolo || rowId || productId) {

                    articoli.push({

                        titolo,

                        quantita,

                        rowId,

                        productId

                    });

                }

            }
        );

        console.log("=================================");
        console.log(
            "ARTICOLI TROVATI:",
            articoli.length
        );
        console.log("=================================");

        console.dir(
            articoli,
            { depth: null }
        );

        // =====================================================
        // RITORNO RISULTATO
        // =====================================================

        return {

            successo: true,

            autenticato: true,

            status: risposta.status,

            lunghezzaHTML:
                typeof html === "string"
                    ? html.length
                    : 0,

            numeroArticoli:
                articoli.length,

            articoli,

            html

        };

    } catch (errore) {

        console.error(
            "================================="
        );

        console.error(
            "ERRORE LETTURA CARRELLO TISCALI"
        );

        console.error(
            "MESSAGGIO:",
            errore.message
        );

        console.error(
            "================================="
        );

        return {

            successo: false,

            autenticato: false,

            errore: errore.message,

            numeroArticoli: 0,

            articoli: []

        };

    }

}                

       
 
  async function aggiornaMiniCartTiscali() {

    try {

        console.log("=================================");
        console.log("AGGIORNAMENTO MINICART TISCALI");
        console.log("=================================");

        const paginaCatalogo = await tiscali.get(
            "https://www.tiscaliformaggi.com/it/catalogo"
        );

        const matchToken =
            paginaCatalogo.data.match(
                /__RequestVerificationToken[^>]*value=["']([^"']+)["']/i
            );

        const token =
            matchToken
                ? matchToken[1]
                : null;

        if (!token) {
            throw new Error("Token CSRF non trovato");
        }

        // Primo RefreshComponent: minicart prodotti
        const dati1 = new URLSearchParams();

        dati1.append("_pageId", "315");
        dati1.append("_pageType", "page");
        dati1.append("_componentId", "955");
        dati1.append(
            "__RequestVerificationToken",
            token
        );

        console.log("INVIO PRIMO REFRESH COMPONENT");

        const risposta1 =
            await tiscali.post(
                "https://www.tiscaliformaggi.com/Async/RefreshComponent",
                dati1.toString(),
                {
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded; charset=UTF-8",

                        "X-Requested-With":
                            "XMLHttpRequest",

                        "Referer":
                            "https://www.tiscaliformaggi.com/it/catalogo",

                        "Origin":
                            "https://www.tiscaliformaggi.com"
                    },

                    validateStatus:
                        () => true
                }
            );

        console.log(
            "PRIMO REFRESH STATUS:",
            risposta1.status
        );

        console.log(
            "MINICART 955 AGGIORNATO"
        );

        // Secondo RefreshComponent: minicart contatore
        const dati2 = new URLSearchParams();

        dati2.append("_pageId", "315");
        dati2.append("_pageType", "page");
        dati2.append("_componentId", "952");
        dati2.append(
            "__RequestVerificationToken",
            token
        );

        console.log("INVIO SECONDO REFRESH COMPONENT");

        const risposta2 =
            await tiscali.post(
                "https://www.tiscaliformaggi.com/Async/RefreshComponent",
                dati2.toString(),
                {
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded; charset=UTF-8",

                        "X-Requested-With":
                            "XMLHttpRequest",

                        "Referer":
                            "https://www.tiscaliformaggi.com/it/catalogo",

                        "Origin":
                            "https://www.tiscaliformaggi.com"
                    },

                    validateStatus:
                        () => true
                }
            );

        console.log(
            "SECONDO REFRESH STATUS:",
            risposta2.status
        );

        console.log(
            "MINICART 952 AGGIORNATO"
        );

        return {

            successo: true,

            minicart955:
                risposta1.data,

            minicart952:
                risposta2.data

        };

    } catch (errore) {

        console.error(
            "ERRORE AGGIORNAMENTO MINICART:",
            errore.message
        );

        return {

            successo: false,

            errore:
                errore.message

        };

    }
}

async function rimuoviProdottoCarrelloTiscali(rowId) {

    try {

        console.log("=================================");
        console.log("RIMOZIONE PRODOTTO DAL CARRELLO");
        console.log("=================================");

        console.log(
            "ROW ID:",
            rowId
        );

        if (!rowId) {

            return {

                successo: false,

                rimosso: false,

                errore:
                    "Row ID mancante"

            };

        }

        const rowIdString =
            String(rowId);

        // =====================================================
        // 1. PAGINA CARRELLO
        // =====================================================

        console.log(
            "GET PAGINA CARRELLO"
        );

        const rispostaCarrello =
            await tiscali.get(
                "https://www.tiscaliformaggi.com/it/catalogo/carrello",
                {
                    headers: {

                        "Referer":
                            "https://www.tiscaliformaggi.com/it/catalogo/carrello"

                    },

                    validateStatus:
                        () => true

                }
            );

        const html =
            rispostaCarrello.data;

        console.log(
            "STATUS CARRELLO:",
            rispostaCarrello.status
        );

        // =====================================================
        // 2. TOKEN CSRF
        // =====================================================

        const $ =
            cheerio.load(html);

        let token = null;

        $('input[name="__RequestVerificationToken"]')
            .each(
                (i, elemento) => {

                    if (!token) {

                        token =
                            $(elemento)
                                .attr("value");

                    }

                }
            );

        if (!token) {

            throw new Error(
                "Token __RequestVerificationToken non trovato"
            );

        }

        console.log(
            "TOKEN TROVATO:",
            true
        );

        console.log(
            "TOKEN LUNGHEZZA:",
            token.length
        );

        // =====================================================
        // 3. PREPARA DATI REMOVE
        // =====================================================

        const dati =
            new URLSearchParams();

        dati.append(
            "_id",
            rowIdString
        );

        dati.append(
            "_tipologia",
            "0"
        );

        dati.append(
            "__RequestVerificationToken",
            token
        );

        console.log(
            "================================="
        );

        console.log(
            "INVIO POST /Async/Cart/Remove"
        );

        console.log(
            "_id:",
            rowIdString
        );

        console.log(
            "_tipologia:",
            "0"
        );

        // =====================================================
        // 4. REMOVE
        // =====================================================

        const rispostaRemove =
            await tiscali.post(

                "https://www.tiscaliformaggi.com/Async/Cart/Remove",

                dati.toString(),

                {

                    headers: {

                        "Content-Type":
                            "application/x-www-form-urlencoded; charset=UTF-8",

                        "X-Requested-With":
                            "XMLHttpRequest",

                        "Referer":
                            "https://www.tiscaliformaggi.com/it/catalogo/carrello",

                        "Origin":
                            "https://www.tiscaliformaggi.com"

                    },

                    validateStatus:
                        () => true

                }

            );

        console.log(
            "REMOVE STATUS:",
            rispostaRemove.status
        );

        console.log(
            "RISPOSTA REMOVE:"
        );

        console.dir(
            rispostaRemove.data,
            { depth: null }
        );

        // =====================================================
        // 5. ANALISI RISPOSTA
        // =====================================================

        let risultatoRemove;

        if (
            typeof rispostaRemove.data ===
            "string"
        ) {

            try {

                risultatoRemove =
                    JSON.parse(
                        rispostaRemove.data
                    );

            } catch {

                risultatoRemove = {

                    risposta:
                        rispostaRemove.data

                };

            }

        } else {

            risultatoRemove =
                rispostaRemove.data;

        }

        const rimosso =
            risultatoRemove?.rimosso === true;

        console.log(
            "TISCALI CONFERMA RIMOZIONE:",
            rimosso
        );

        // =====================================================
        // 6. VERIFICA CARRELLO
        // =====================================================

        const verifica =
            await leggiCarrelloTiscali();

        console.log(
            "CARRELLO DOPO RIMOZIONE:"
        );

        console.dir(
            verifica,
            { depth: null }
        );

        // =====================================================
        // 7. RISULTATO
        // =====================================================

        return {

            successo:
                rispostaRemove.status === 200 &&
                rimosso,

            rimosso,

            rowId:
                rowIdString,

            risposta:
                risultatoRemove,

            verificaCarrello:
                verifica

        };

    } catch (errore) {

        console.error(
            "================================="
        );

        console.error(
            "ERRORE RIMOZIONE CARRELLO"
        );

        console.error(
            "MESSAGGIO:",
            errore.message
        );

        console.error(
            "================================="
        );

        return {

            successo: false,

            rimosso: false,

            errore:
                errore.message

        };

    }

}
async function svuotaCarrelloTiscali() {

    try {

        console.log("=================================");
        console.log("=== SVUOTAMENTO CARRELLO TISCALI ===");
        console.log("=================================");

        let rimossi = [];
        let errori = [];

        const MAX_TENTATIVI = 100;

        for (
            let tentativo = 1;
            tentativo <= MAX_TENTATIVI;
            tentativo++
        ) {

            console.log(
                `\n--- LETTURA CARRELLO ${tentativo} ---`
            );

            // =====================================================
            // LEGGIAMO IL CARRELLO CON LA FUNZIONE GIÀ CORRETTA
            // =====================================================

            const carrello =
                await contaArticoliCarrelloTiscali();

            console.log(
                "RISULTATO LETTURA CARRELLO:"
            );

            console.dir(
                carrello,
                { depth: null }
            );

            if (!carrello.successo) {

                return {

                    successo: false,

                    carrelloVuoto: false,

                    numeroRimossi:
                        rimossi.length,

                    rimossi,

                    errori,

                    errore:
                        carrello.errore ||
                        "Impossibile leggere il carrello"

                };

            }

            // =====================================================
            // CARRELLO VUOTO
            // =====================================================

            if (
                !carrello.articoli ||
                carrello.articoli.length === 0
            ) {

                console.log(
                    "================================="
                );

                console.log(
                    "=== CARRELLO VUOTO ==="
                );

                console.log(
                    "================================="
                );

                return {

                    successo: true,

                    carrelloVuoto: true,

                    numeroRimossi:
                        rimossi.length,

                    rimossi,

                    errori

                };

            }

            // =====================================================
            // PRENDIAMO IL PRIMO ARTICOLO
            // =====================================================

            const articolo =
                carrello.articoli[0];

            console.log(
                "ARTICOLO DA RIMUOVERE:"
            );

            console.dir(
                articolo,
                { depth: null }
            );

            // =====================================================
            // IL REMOVE VUOLE IL ROW ID
            // =====================================================

            const rowId =
                articolo.rowId;

            const productId =
                articolo.productId;

            if (!rowId) {

                console.error(
                    "ROW ID MANCANTE:"
                );

                console.dir(
                    articolo,
                    { depth: null }
                );

                errori.push({

                    productId:
                        productId || null,

                    rowId: null,

                    errore:
                        "Row ID mancante"

                });

                break;

            }

            console.log(
                "PRODUCT ID:",
                productId
            );

            console.log(
                "ROW ID DA RIMUOVERE:",
                rowId
            );

            // =====================================================
            // RIMOZIONE
            // =====================================================

            const risultato =
                await rimuoviProdottoCarrelloTiscali(
                    rowId
                );

            console.log(
                "RISULTATO RIMOZIONE:"
            );

            console.dir(
                risultato,
                { depth: null }
            );

            // =====================================================
            // RIMOZIONE RIUSCITA
            // =====================================================

            if (
                risultato.successo &&
                risultato.rimosso
            ) {

                rimossi.push({

                    productId:
                        productId || null,

                    rowId:
                        rowId,

                    quantita:
                        articolo.quantita || null

                });

                console.log(
                    "PRODOTTO RIMOSSO CORRETTAMENTE:"
                );

                console.log(
                    "PRODUCT ID:",
                    productId
                );

                console.log(
                    "ROW ID:",
                    rowId
                );

                // Continuiamo con il prossimo prodotto

                continue;

            }

            // =====================================================
            // ERRORE
            // =====================================================

            errori.push({

                productId:
                    productId || null,

                rowId:
                    rowId,

                errore:
                    risultato.errore ||
                    risultato.messaggio ||
                    "Impossibile rimuovere il prodotto"

            });

            console.error(
                "IMPOSSIBILE RIMUOVERE IL PRODOTTO"
            );

            break;

        }

        // =====================================================
        // LIMITE TENTATIVI
        // =====================================================

        return {

            successo:
                errori.length === 0,

            carrelloVuoto: false,

            numeroRimossi:
                rimossi.length,

            rimossi,

            errori,

            errore:
                "Raggiunto il limite massimo di tentativi"

        };

    } catch (errore) {

        console.error(
            "================================="
        );

        console.error(
            "=== ERRORE SVUOTAMENTO CARRELLO ==="
        );

        console.error(
            "MESSAGGIO:",
            errore.message
        );

        console.error(
            "================================="
        );

        return {

            successo: false,

            carrelloVuoto: false,

            numeroRimossi: 0,

            rimossi: [],

            errori: [],

            errore:
                errore.message

        };

    }

}
async function contaArticoliCarrelloTiscali() {

    console.log("=================================");
    console.log("LETTURA COMPLETA CARRELLO TISCALI");
    console.log("=================================");

    try {

        const risposta = await tiscali.get(
            "https://www.tiscaliformaggi.com/it/catalogo/carrello",
            {
                headers: {
                    "Referer":
                        "https://www.tiscaliformaggi.com/it/catalogo/ordini",

                    "X-Requested-With":
                        "XMLHttpRequest"
                },

                validateStatus: () => true
            }
        );

        const html = risposta.data;

console.log("STATUS:", risposta.status);
console.log("LUNGHEZZA HTML:", html.length);

console.log(
    "URL CARRELLO:",
    risposta.request?.res?.responseUrl
);

console.log(
    "CARRELLO CONTIENE FORM. GRANA PADANO:",
    html.includes("FORM. GRANA PADANO")
);

console.log(
    "CARRELLO CONTIENE CODICE 2025:",
    html.includes("2025")
);

console.log(
    "CARRELLO CONTIENE VINO SANGIOVESE:",
    html.includes("VINO SANGIOVESE")
);

console.log(
    "PRIMI 2000 CARATTERI DEL CARRELLO:"
);

console.log(
    html.substring(0, 2000)
);
console.log("=================================");
console.log("### ARRIVATO QUI ###");
console.log("RICERCA ARTICOLO 2025");
console.log("=================================");

const posizione2025 = html.indexOf("FORM. GRANA PADANO");

console.log("POSIZIONE ARTICOLO:", posizione2025);

if (posizione2025 !== -1) {
    console.log(
        html.substring(
            Math.max(0, posizione2025 - 1500),
            posizione2025 + 3000
        )
    );
}

        const articoli = [];

        /*
         * Struttura reale trovata nel carrello:
         *
         * <div
         *   data-entryid="5863"
         *   data-quantity="3,000000"
         *   id="17480"
         *   class="ecCartCustomComp-cartTableRow ... incart row">
         */

        const regex = /<div\b[^>]*data-entryid=["']([^"']+)["'][^>]*data-quantity=["']([^"']+)["'][^>]*id=["']([^"']+)["'][^>]*class=["'][^"']*ecCartCustomComp-cartTableRow[^"']*["'][^>]*>/gi;

        let match;

        while ((match = regex.exec(html)) !== null) {

            const productId = match[1];
            const quantita = match[2];
            const rowId = match[3];

            articoli.push({
                productId,
                quantita,
                rowId
            });
        }

        console.log("=================================");
        console.log("ARTICOLI TROVATI:", articoli.length);
        console.log("=================================");

        console.dir(articoli, {
            depth: null
        });

        return {

            successo: true,

            status: risposta.status,

            lunghezzaHTML: html.length,

            numeroArticoli: articoli.length,

            articoli,

            html

        };

    } catch (errore) {

        console.error(
            "=== ERRORE LETTURA CARRELLO ==="
        );

        console.error(
            "MESSAGGIO:",
            errore.message
        );

        console.error(
            "STATUS:",
            errore.response?.status
        );

        return {

            successo: false,

            status:
                errore.response?.status || null,

            errore:
                errore.message,

            numeroArticoli: 0,

            articoli: []

        };
    }
}
async function trovaProdottoNelCarrello(productId) {

    console.log("=== CERCA PRODOTTO NEL CARRELLO ===");
    console.log("PRODUCT ID:", productId);

    try {

        const risultato = await contaArticoliCarrelloTiscali();

        if (!risultato.successo) {

            return {
                trovato: false,
                productId: String(productId),
                quantita: 0,
                rowId: null,
                errore: risultato.errore || "Errore lettura carrello"
            };

        }

        const prodotto = risultato.articoli.find(
            articolo =>
                String(articolo.productId) === String(productId)
        );

        if (!prodotto) {

            console.log(
                "PRODOTTO NON TROVATO:",
                productId
            );

            return {
                trovato: false,
                productId: String(productId),
                quantita: 0,
                rowId: null
            };

        }

        const quantitaNumerica = parseFloat(
            String(prodotto.quantita)
                .replace(",", ".")
        );

        console.log(
            "PRODOTTO TROVATO:",
            prodotto
        );

        return {

            trovato: true,

            productId: String(prodotto.productId),

            quantita: isNaN(quantitaNumerica)
                ? 0
                : quantitaNumerica,

            rowId: prodotto.rowId

        };

    } catch (errore) {

        console.error(
            "ERRORE TROVA PRODOTTO:",
            errore.message
        );

        return {

            trovato: false,

            productId: String(productId),

            quantita: 0,

            rowId: null,

            errore: errore.message

        };

    }
}
module.exports = {
    testaTiscali,
    leggiPaginaLogin,
    loginTiscali,
    verificaSessioneTiscali,
    cercaProdottoTiscali,
aggiungiAlCarrelloTiscali,
verificaCarrelloTiscali,
analizzaEliminazioneCarrelloTiscali,
leggiCarrelloTiscali,
aggiornaMiniCartTiscali,
rimuoviProdottoCarrelloTiscali,
contaArticoliCarrelloTiscali,
debugCookieTiscali,
trovaProdottoNelCarrello,
svuotaCarrelloTiscali

};
