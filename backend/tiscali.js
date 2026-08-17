
const cheerio = require("cheerio");
const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

// =====================================================
// SESSIONI TISCALI PER PUNTO VENDITA
// =====================================================

const sessioniTiscali = new Map();


// =====================================================
// CREA UNA NUOVA SESSIONE TISCALI
// =====================================================

function creaSessioneTiscali(puntoVenditaId) {

    const id = String(puntoVenditaId);

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

    const sessione = {
        puntoVenditaId: id,
        jar,
        tiscali
    };

    sessioniTiscali.set(
        id,
        sessione
    );

    console.log("=================================");
    console.log("NUOVA SESSIONE TISCALI CREATA");
    console.log("PUNTO VENDITA:", id);
    console.log("SESSIONI ATTIVE:", sessioniTiscali.size);
    console.log("=================================");

    return sessione;
}


// =====================================================
// RECUPERA SESSIONE TISCALI
// =====================================================

function getSessioneTiscali(puntoVenditaId) {

    if (
        puntoVenditaId === undefined ||
        puntoVenditaId === null ||
        puntoVenditaId === ""
    ) {

        throw new Error(
            "puntoVenditaId obbligatorio per utilizzare la sessione Tiscali"
        );
    }

    const id = String(puntoVenditaId);

    let sessione =
        sessioniTiscali.get(id);

    if (!sessione) {

        console.log(
            "NESSUNA SESSIONE TROVATA PER IL PUNTO VENDITA:",
            id
        );

        sessione =
            creaSessioneTiscali(id);
    }

    return sessione;
}


// =====================================================
// TEST CONNESSIONE TISCALI
// =====================================================

async function testaTiscali(puntoVenditaId) {

    try {

        const sessione =
            getSessioneTiscali(puntoVenditaId);

        const tiscali =
            sessione.tiscali;

        const risposta =
            await tiscali.get(
                "https://www.tiscaliformaggi.com/it/catalogo"
            );

        console.log(
            "Tiscali raggiunto:",
            risposta.status
        );

        return {

            successo: true,

            status:
                risposta.status,

            puntoVenditaId:
                String(puntoVenditaId)

        };

    } catch (errore) {

        console.error(
            "Errore Tiscali:",
            errore.message
        );

        return {

            successo: false,

            puntoVenditaId:
                puntoVenditaId != null
                    ? String(puntoVenditaId)
                    : null,

            errore:
                errore.message

        };

    }

}


// =====================================================
// LEGGI PAGINA LOGIN
// =====================================================

async function leggiPaginaLogin(puntoVenditaId) {

    try {

        const sessione =
            getSessioneTiscali(puntoVenditaId);

        const tiscali =
            sessione.tiscali;

        const risposta =
            await tiscali.get(
                "https://www.tiscaliformaggi.com/it/accesso"
            );

        const $ =
            cheerio.load(
                risposta.data
            );

        const form =
            $("form").first();

        const action =
            form.attr("action") || "";

        const method =
            form.attr("method") || "";

        const campi = [];

        form.find("input").each(
            (i, elemento) => {

                campi.push({

                    name:
                        $(elemento).attr("name") || "",

                    type:
                        $(elemento).attr("type") || "",

                    value:
                        $(elemento).attr("value") || ""

                });

            }
        );

        const html =
            risposta.data;

        const posizioneToken =
            html.indexOf(
                "__RequestVerificationToken"
            );

        console.log("FORM LOGIN");
        console.log("Punto vendita:", puntoVenditaId);
        console.log("Action:", action);
        console.log("Method:", method);
        console.log("Campi:", campi);

        console.log(
            "DATA-ENTRYID NELL'HTML:",
            (html.match(/data-entryid=/g) || []).length
        );

        console.log(
            "8543 PRESENTE:",
            html.includes('data-entryid="8543"')
        );

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

            status:
                risposta.status,

            puntoVenditaId:
                String(puntoVenditaId),

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

            puntoVenditaId:
                puntoVenditaId != null
                    ? String(puntoVenditaId)
                    : null,

            errore:
                errore.message

        };

    }

}


// =====================================================
// LOGIN TISCALI
// =====================================================

async function loginTiscali(
    puntoVenditaId,
    username,
    password
) {

    try {

        const sessione =
            getSessioneTiscali(puntoVenditaId);

        const tiscali =
            sessione.tiscali;

        const jar =
            sessione.jar;

        console.log("=================================");
        console.log("LOGIN TISCALI");
        console.log("PUNTO VENDITA:", puntoVenditaId);
        console.log("=================================");

        console.log("=== INIZIO LOGIN TISCALI ===");

        console.log("1. GET PAGINA LOGIN");

        const pagina =
            await tiscali.get(
                "https://www.tiscaliformaggi.com/it/accesso"
            );

        console.log(
            "GET LOGIN STATUS:",
            pagina.status
        );

        console.log(
            "GET LOGIN URL:",
            pagina.request?.res?.responseUrl ||
            "non disponibile"
        );

        const html =
            pagina.data;

        const match =
            html.match(
                /__RequestVerificationToken[^>]*value=["']([^"']+)["']/i
            );

        console.log(
            "TOKEN TROVATO:",
            !!match
        );

        if (!match) {

            return {

                successo: false,

                puntoVenditaId:
                    String(puntoVenditaId),

                errore:
                    "Token CSRF non trovato"

            };

        }

        const token =
            match[1];

        console.log(
            "TOKEN LUNGHEZZA:",
            token.length
        );

        const dati =
            new URLSearchParams();

        dati.append(
            "username",
            username
        );

        dati.append(
            "password",
            password
        );

        dati.append(
            "form_sent",
            "login"
        );

        dati.append(
            "pageToredirect",
            "319"
        );

        dati.append(
            "pageToredirectBuy",
            "317"
        );

        dati.append(
            "pagePopup",
            "False"
        );

        dati.append(
            "enablePageRedirectForAll",
            "0"
        );

        dati.append(
            "_pageId",
            "306"
        );

        dati.append(
            "_componentId",
            "1265"
        );

        dati.append(
            "__RequestVerificationToken",
            token
        );

        console.log("2. POST LOGIN");

        const risposta =
            await tiscali.post(
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

                    validateStatus:
                        () => true

                }
            );

        console.log(
            "LOGIN RESPONSE STATUS:",
            risposta.status
        );

        console.log(
            "LOGIN RESPONSE URL:",
            risposta.request?.res?.responseUrl ||
            "non disponibile"
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

        if (
            risposta.status < 200 ||
            risposta.status >= 300
        ) {

            return {

                successo: false,

                status:
                    risposta.status,

                puntoVenditaId:
                    String(puntoVenditaId),

                errore:
                    "Il server Tiscali ha restituito HTTP " +
                    risposta.status,

                risposta:
                    risposta.data

            };

        }

        console.log(
            "=== LOGIN COMPLETATO ==="
        );

        console.log(
            "PUNTO VENDITA:",
            puntoVenditaId
        );

        return {

            successo: true,

            status:
                risposta.status,

            puntoVenditaId:
                String(puntoVenditaId),

            token,

            returnedCode:
                risposta.data?.returnedCode ||
                null,

            returnedError:
                risposta.data?.returnedError ||
                null,

            location:
                risposta.data?.location ||
                null,

            dataPresente:
                !!risposta.data?.data

        };

    } catch (errore) {

        console.error(
            "=== ERRORE LOGIN TISCALI ==="
        );

        console.error(
            "PUNTO VENDITA:",
            puntoVenditaId
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

            puntoVenditaId:
                String(puntoVenditaId),

            errore:
                errore.message,

            url:
                errore.config?.url ||
                null,

            status:
                errore.response?.status ||
                null

        };

    }

}


// =====================================================
// CERCA PRODOTTO TISCALI
// =====================================================

async function cercaProdottoTiscali(
    puntoVenditaId,
    codice
) {

    try {

        const sessione =
            getSessioneTiscali(puntoVenditaId);

        const tiscali =
            sessione.tiscali;

        const paginaCatalogo =
            await tiscali.get(
                "https://www.tiscaliformaggi.com/it/catalogo"
            );

        const matchToken =
            paginaCatalogo.data.match(
                /__RequestVerificationToken[^>]*value=["']([^"']+)["']/i
            );

        const tokenCatalogo =
            matchToken
                ? matchToken[1]
                : null;

        console.log(
            "Token catalogo trovato:",
            !!tokenCatalogo
        );

        // =====================================================
        // 1. EXECUTE FILTER
        // =====================================================

        const dati =
            new URLSearchParams();

        dati.append(
            "_pageId",
            "315"
        );

        dati.append(
            "_pageType",
            "page"
        );

        dati.append(
            "_filterId",
            "1469"
        );

        dati.append(
            "_filters",
            `codice=${codice}&titolo=`
        );

        dati.append(
            "_location",
            "/it/catalogo"
        );

        dati.append(
            "_cascaded",
            "true"
        );

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

        const risposta =
            await tiscali.post(
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

        // =====================================================
        // 2. REFRESH FILTRI 1469
        // =====================================================

        const refreshDati =
            new URLSearchParams();

        refreshDati.append(
            "_pageId",
            "315"
        );

        refreshDati.append(
            "_pageType",
            "page"
        );

        refreshDati.append(
            "_componentId",
            "1469"
        );

        if (tokenCatalogo) {

            refreshDati.append(
                "__RequestVerificationToken",
                tokenCatalogo
            );

        }

        const rispostaRefresh =
            await tiscali.post(
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

        // =====================================================
        // 3. REFRESH RISULTATI 1493
        // =====================================================

        const risultatiDati =
            new URLSearchParams();

        risultatiDati.append(
            "_pageId",
            "315"
        );

        risultatiDati.append(
            "_pageType",
            "page"
        );

        risultatiDati.append(
            "_componentId",
            "1493"
        );

        if (tokenCatalogo) {

            risultatiDati.append(
                "__RequestVerificationToken",
                tokenCatalogo
            );

        }

        const rispostaRisultati =
            await tiscali.post(
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

        // =====================================================
        // 4. CERCA PRODOTTO NEL RISULTATO
        // =====================================================

        const html =
            rispostaRisultati.data?.data ||
            "";

        console.log(
            "LUNGHEZZA HTML RISULTATI:",
            html.length
        );

        const posAdd =
            html.indexOf(
                "/Async/Cart/Add"
            );

        if (posAdd !== -1) {

            const inizio =
                Math.max(
                    0,
                    posAdd - 1500
                );

            const fine =
                Math.min(
                    html.length,
                    posAdd + 3000
                );

            console.log(
                html.substring(
                    inizio,
                    fine
                )
            );

        } else {

            console.log(
                "NESSUN /Async/Cart/Add TROVATO NELL'HTML"
            );

        }

        const $risultati =
            cheerio.load(html);

        let prodottoElemento = null;
        let productId = null;
        let entryId = null;

        $risultati(
            "[data-action='addtocart']"
        ).each(
            (i, elemento) => {

                const id =
                    $risultati(elemento)
                        .attr("data-productid");

                if (!id) {
                    return;
                }

                const contenitore =
                    $risultati(elemento)
                        .closest(
                            ".ContainerRowComp"
                        );

                const testo =
                    contenitore
                        .text()
                        .replace(
                            /\s+/g,
                            " "
                        )
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

        // =====================================================
        // CODICE / DESCRIZIONE
        // =====================================================

        let codiceTrovato = "";
        let descrizioneTrovata = "";

        if (prodottoElemento) {

            const testo =
                prodottoElemento
                    .text()
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim();

            if (
                testo.includes(codice)
            ) {

                codiceTrovato =
                    codice;

            }

            const titolo =
                prodottoElemento
                    .find(".titoloArticolo")
                    .first()
                    .text()
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim();

            descrizioneTrovata =
                titolo;

        }

        // =====================================================
        // ENTRY ID
        // =====================================================

        if (prodottoElemento) {

            const elementoEntry =
                prodottoElemento
                    .find("[data-entryid]")
                    .first();

            if (
                elementoEntry.length
            ) {

                entryId =
                    elementoEntry.attr(
                        "data-entryid"
                    ) || null;

            }

        }

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

        return {

            successo: true,

            status:
                rispostaRisultati.status,

            puntoVenditaId:
                String(puntoVenditaId),

            codice,

            prodottoTrovato:
                !!productId,

            productId,

            entryId,

            codiceTrovato,

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

            puntoVenditaId:
                String(puntoVenditaId),

            codice,

            errore:
                errore.message

        };

    }

}


// =====================================================
// AGGIUNGI AL CARRELLO TISCALI
// =====================================================

async function aggiungiAlCarrelloTiscali(
    puntoVenditaId,
    productId,
    quantita
) {

    try {

        const sessione =
            getSessioneTiscali(puntoVenditaId);

        const tiscali =
            sessione.tiscali;

        const jar =
            sessione.jar;

        console.log("=================================");
        console.log("AGGIUNTA CARRELLO");
        console.log("PUNTO VENDITA:", puntoVenditaId);
        console.log("PRODUCT ID:", productId);
        console.log("QUANTITA:", quantita);
        console.log(
            "TEST MODE:",
            process.env.TISCALI_TEST_MODE
        );
        console.log("=================================");

        if (!productId) {

            return {

                successo: false,

                errore:
                    "Product ID mancante"

            };

        }

        if (
            process.env.TISCALI_TEST_MODE ===
            "true"
        ) {

            console.log(
                "MODALITÀ TEST: carrello NON modificato"
            );

            return {

                successo: true,

                puntoVenditaId:
                    String(puntoVenditaId),

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

        console.log(
            "GET PAGINA CATALOGO"
        );

        const paginaCatalogo =
            await tiscali.get(
                "https://www.tiscaliformaggi.com/it/catalogo"
            );

        console.log(
            "STATUS PAGINA CATALOGO:",
            paginaCatalogo.status
        );

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
            "DATI POST:",
            dati.toString().replace(
                /__RequestVerificationToken=[^&]+/,
                "__RequestVerificationToken=TOKEN"
            )
        );

        console.log(
            "COOKIE PRIMA CART/ADD:"
        );

        console.log(
            await jar.getCookieString(
                "https://www.tiscaliformaggi.com"
            )
        );

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

        console.log(
            "RISPOSTA CART/ADD:"
        );

        console.dir(
            risposta.data,
            { depth: null }
        );

        console.log(
            "COOKIE DOPO CART/ADD:"
        );

        console.log(
            await jar.getCookieString(
                "https://www.tiscaliformaggi.com"
            )
        );

        const carrelloModificato =
            risposta.status >= 200 &&
            risposta.status < 300;

        return {

            successo:
                carrelloModificato,

            puntoVenditaId:
                String(puntoVenditaId),

            modalitaTest: false,

            carrelloModificato,

            status:
                risposta.status,

            entryId:
                String(productId),

            quantita:
                Number(quantita),

            risposta:
                risposta.data

        };

    } catch (errore) {

        console.error(
            "ERRORE AGGIUNTA CARRELLO:",
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

        return {

            successo: false,

            puntoVenditaId:
                puntoVenditaId != null
                    ? String(puntoVenditaId)
                    : null,

            modalitaTest: false,

            carrelloModificato: false,

            errore:
                errore.message,

            status:
                errore.response?.status ||
                null,

            risposta:
                errore.response?.data ||
                null

        };

    }

}


// =====================================================
// VERIFICA CARRELLO
// =====================================================

async function verificaCarrelloTiscali(
    puntoVenditaId,
    productId,
    codice
) {

    try {

        const sessione =
            getSessioneTiscali(puntoVenditaId);

        const tiscali =
            sessione.tiscali;

        const risposta =
            await tiscali.get(
                "https://www.tiscaliformaggi.com/it/catalogo/carrello"
            );

        const html =
            risposta.data;

        console.log(
            "================================="
        );

        console.log(
            "VERIFICA CARRELLO TISCALI"
        );

        console.log(
            "PUNTO VENDITA:",
            puntoVenditaId
        );

        console.log(
            "PRODUCT ID CERCA:",
            productId
        );

        console.log(
            "CODICE CERCA:",
            codice
        );

        console.log(
            "LUNGHEZZA HTML:",
            html.length
        );

        console.log(
            "================================="
        );

        const contieneProductId =
            html.includes(
                String(productId)
            );

        const contieneCodice =
            html.includes(
                String(codice)
            );

        if (contieneProductId) {

            const posizione =
                html.indexOf(
                    String(productId)
                );

            console.log(
                html.substring(
                    Math.max(
                        0,
                        posizione - 500
                    ),
                    posizione + 1000
                )
            );

        }

        return {

            successo: true,

            status:
                risposta.status,

            puntoVenditaId:
                String(puntoVenditaId),

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

            puntoVenditaId:
                String(puntoVenditaId),

            errore:
                errore.message

        };

    }

}


// =====================================================
// ANALIZZA ELIMINAZIONE CARRELLO
// =====================================================

async function analizzaEliminazioneCarrelloTiscali(
    puntoVenditaId,
    productId
) {

    try {

        console.log(
            "================================="
        );

        console.log(
            "ANALISI RIMOZIONE CARRELLO"
        );

        console.log(
            "PUNTO VENDITA:",
            puntoVenditaId
        );

        console.log(
            "PRODUCT ID:",
            productId
        );

        console.log(
            "================================="
        );

        const carrello =
            await leggiCarrelloTiscali(
                puntoVenditaId
            );

        if (!carrello.successo) {

            return {

                successo: false,

                errore:
                    "Impossibile leggere il carrello"

            };

        }

        const prodotto =
            carrello.articoli.find(
                articolo =>
                    articolo.productId ===
                    String(productId)
            );

        if (!prodotto) {

            return {

                successo: true,

                trovato: false,

                puntoVenditaId:
                    String(puntoVenditaId),

                productId:
                    String(productId),

                messaggio:
                    "Prodotto non presente nel carrello"

            };

        }

        return {

            successo: true,

            trovato: true,

            puntoVenditaId:
                String(puntoVenditaId),

            productId:
                String(productId),

            rowId:
                prodotto.rowId,

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

            puntoVenditaId:
                String(puntoVenditaId),

            errore:
                errore.message

        };

    }

}


// =====================================================
// DEBUG COOKIE TISCALI
// =====================================================

function debugCookieTiscali(puntoVenditaId) {

    try {

        const sessione =
            getSessioneTiscali(
                puntoVenditaId
            );

        const jar =
            sessione.jar;

        const cookies =
            jar.getCookiesSync(
                "https://www.tiscaliformaggi.com"
            );

        console.log(
            "================================="
        );

        console.log(
            "COOKIE SESSIONE TISCALI"
        );

        console.log(
            "PUNTO VENDITA:",
            puntoVenditaId
        );

        console.log(
            "NUMERO COOKIE:",
            cookies.length
        );

        console.log(
            "================================="
        );

        cookies.forEach(
            (cookie, i) => {

                console.log(
                    i + 1,
                    cookie.key,
                    "=",
                    cookie.value
                );

            }
        );

        return cookies.map(
            cookie => ({

                nome:
                    cookie.key,

                valore:
                    cookie.value

            })
        );

    } catch (errore) {

        console.error(
            "ERRORE LETTURA COOKIE:",
            errore.message
        );

        return [];

    }

}


// =====================================================
// VERIFICA SESSIONE TISCALI
// =====================================================

async function verificaSessioneTiscali(
    puntoVenditaId
) {

    try {

        const sessione =
            getSessioneTiscali(
                puntoVenditaId
            );

        const tiscali =
            sessione.tiscali;

        const risposta =
            await tiscali.get(
                "https://www.tiscaliformaggi.com/it/catalogo"
            );

        const html =
            risposta.data;

        const loginPresente =
            html.includes("Logout") ||
            html.includes("Esci") ||
            html.includes("logout");

        return {

            successo: true,

            status:
                risposta.status,

            puntoVenditaId:
                String(puntoVenditaId),

            paginaAccessibile: true,

            loginPresente,

            lunghezzaHTML:
                html.length

        };

    } catch (errore) {

        return {

            successo: false,

            puntoVenditaId:
                String(puntoVenditaId),

            errore:
                errore.message

        };

    }

}


// =====================================================
// LEGGI CARRELLO TISCALI
// =====================================================

async function leggiCarrelloTiscali(
    puntoVenditaId
) {

    try {

        const sessione =
            getSessioneTiscali(
                puntoVenditaId
            );

        const tiscali =
            sessione.tiscali;

        console.log(
            "================================="
        );

        console.log(
            "LETTURA COMPLETA CARRELLO TISCALI"
        );

        console.log(
            "PUNTO VENDITA:",
            puntoVenditaId
        );

        console.log(
            "================================="
        );

        const risposta =
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
            risposta.data;

        console.log(
            "STATUS CARRELLO:",
            risposta.status
        );

        console.log(
            "URL CARRELLO:",
            risposta.request?.res?.responseUrl ||
            "non disponibile"
        );

        console.log(
            "LUNGHEZZA HTML:",
            typeof html === "string"
                ? html.length
                : 0
        );

        if (
            typeof html === "string" &&
            (
                html.includes(
                    "Username/Password errate"
                ) ||
                html.includes(
                    "<title>Accesso - Tiscali Formaggi</title>"
                )
            )
        ) {

            console.log(
                "⚠️ TISCALI STA MOSTRANDO LA PAGINA LOGIN"
            );

            return {

                successo: false,

                autenticato: false,

                status:
                    risposta.status,

                puntoVenditaId:
                    String(puntoVenditaId),

                errore:
                    "La sessione Tiscali non risulta autenticata",

                numeroArticoli: 0,

                articoli: []

            };

        }

        const $ =
            cheerio.load(html);

        const articoli = [];

        $(
            ".ecMinicartComp-latestItemsOnCart > .d-flex"
        ).each(
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
                        .find(
                            ".ecMinicartComp-itemQty"
                        )
                        .text()
                        .trim() ||

                    null;

                const rowId =
                    $(elemento)
                        .find(
                            "button[data-rowid]"
                        )
                        .attr("data-rowid") ||

                    null;

                const productId =
                    $(elemento)
                        .find("[data-productid]")
                        .attr("data-productid") ||

                    null;

                if (
                    titolo ||
                    rowId ||
                    productId
                ) {

                    articoli.push({

                        titolo,

                        quantita,

                        rowId,

                        productId

                    });

                }

            }
        );

        console.log(
            "ARTICOLI TROVATI:",
            articoli.length
        );

        console.dir(
            articoli,
            { depth: null }
        );

        return {

            successo: true,

            autenticato: true,

            status:
                risposta.status,

            puntoVenditaId:
                String(puntoVenditaId),

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
            "ERRORE LETTURA CARRELLO TISCALI:",
            errore.message
        );

        return {

            successo: false,

            autenticato: false,

            puntoVenditaId:
                String(puntoVenditaId),

            errore:
                errore.message,

            numeroArticoli: 0,

            articoli: []

        };

    }

}


// =====================================================
// AGGIORNA MINICART TISCALI
// =====================================================

async function aggiornaMiniCartTiscali(
    puntoVenditaId
) {

    try {

        const sessione =
            getSessioneTiscali(
                puntoVenditaId
            );

        const tiscali =
            sessione.tiscali;

        console.log(
            "================================="
        );

        console.log(
            "AGGIORNAMENTO MINICART TISCALI"
        );

        console.log(
            "PUNTO VENDITA:",
            puntoVenditaId
        );

        console.log(
            "================================="
        );

        const paginaCatalogo =
            await tiscali.get(
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

            throw new Error(
                "Token CSRF non trovato"
            );

        }

        // =====================================================
        // MINICART 955
        // =====================================================

        const dati1 =
            new URLSearchParams();

        dati1.append(
            "_pageId",
            "315"
        );

        dati1.append(
            "_pageType",
            "page"
        );

        dati1.append(
            "_componentId",
            "955"
        );

        dati1.append(
            "__RequestVerificationToken",
            token
        );

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

        // =====================================================
        // MINICART 952
        // =====================================================

        const dati2 =
            new URLSearchParams();

        dati2.append(
            "_pageId",
            "315"
        );

        dati2.append(
            "_pageType",
            "page"
        );

        dati2.append(
            "_componentId",
            "952"
        );

        dati2.append(
            "__RequestVerificationToken",
            token
        );

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

        return {

            successo: true,

            puntoVenditaId:
                String(puntoVenditaId),

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

            puntoVenditaId:
                String(puntoVenditaId),

            errore:
                errore.message

        };

    }

}


// =====================================================
// RIMUOVI PRODOTTO DAL CARRELLO
// =====================================================

async function rimuoviProdottoCarrelloTiscali(
    puntoVenditaId,
    rowId
) {

    try {

        console.log(
            "================================="
        );

        console.log(
            "RIMOZIONE PRODOTTO DAL CARRELLO"
        );

        console.log(
            "PUNTO VENDITA:",
            puntoVenditaId
        );

        console.log(
            "ROW ID:",
            rowId
        );

        console.log(
            "================================="
        );

        if (!rowId) {

            return {

                successo: false,

                rimosso: false,

                errore:
                    "Row ID mancante"

            };

        }

        const sessione =
            getSessioneTiscali(
                puntoVenditaId
            );

        const tiscali =
            sessione.tiscali;

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

        const $ =
            cheerio.load(html);

        let token = null;

        $(
            'input[name="__RequestVerificationToken"]'
        ).each(
            (i, elemento) => {

                if (!token) {

                    token =
                        $(elemento).attr(
                            "value"
                        );

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

        const rowIdString =
            String(rowId);

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
            "INVIO POST /Async/Cart/Remove"
        );

        console.log(
            "_id:",
            rowIdString
        );

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

        const verifica =
            await leggiCarrelloTiscali(
                puntoVenditaId
            );

        return {

            successo:
                rispostaRemove.status === 200 &&
                rimosso,

            rimosso,

            puntoVenditaId:
                String(puntoVenditaId),

            rowId:
                rowIdString,

            risposta:
                risultatoRemove,

            verificaCarrello:
                verifica

        };

    } catch (errore) {

        console.error(
            "ERRORE RIMOZIONE CARRELLO:",
            errore.message
        );

        return {

            successo: false,

            rimosso: false,

            puntoVenditaId:
                puntoVenditaId != null
                    ? String(puntoVenditaId)
                    : null,

            errore:
                errore.message

        };

    }

}


// =====================================================
// SVUOTA CARRELLO
// =====================================================

async function svuotaCarrelloTiscali(
    puntoVenditaId
) {

    console.log(
        "================================="
    );

    console.log(
        "SVUOTAMENTO CARRELLO DISATTIVATO"
    );

    console.log(
        "PUNTO VENDITA:",
        puntoVenditaId
    );

    console.log(
        "IL CARRELLO TISCALI NON VERRA' CANCELLATO"
    );

    console.log(
        "================================="
    );

    return {

        successo: true,

        puntoVenditaId:
            puntoVenditaId != null
                ? String(puntoVenditaId)
                : null,

        carrelloVuoto: true,

        numeroRimossi: 0,

        rimossi: [],

        errori: [],

        disattivato: true

    };

}


// =====================================================
// CONTA ARTICOLI CARRELLO
// =====================================================

async function contaArticoliCarrelloTiscali(
    puntoVenditaId
) {

    console.log(
        "================================="
    );

    console.log(
        "LETTURA COMPLETA CARRELLO TISCALI"
    );

    console.log(
        "PUNTO VENDITA:",
        puntoVenditaId
    );

    console.log(
        "================================="
    );

    try {

        const sessione =
            getSessioneTiscali(
                puntoVenditaId
            );

        const tiscali =
            sessione.tiscali;

        const risposta =
            await tiscali.get(
                "https://www.tiscaliformaggi.com/it/catalogo/carrello",

                {

                    headers: {

                        "Referer":
                            "https://www.tiscaliformaggi.com/it/catalogo/ordini",

                        "X-Requested-With":
                            "XMLHttpRequest"

                    },

                    validateStatus:
                        () => true

                }
            );

        const html =
            risposta.data;

        console.log(
            "STATUS:",
            risposta.status
        );

        console.log(
            "LUNGHEZZA HTML:",
            html.length
        );

        console.log(
            "URL CARRELLO:",
            risposta.request?.res?.responseUrl
        );

        console.log(
            "CARRELLO CONTIENE FORM. GRANA PADANO:",
            html.includes(
                "FORM. GRANA PADANO"
            )
        );

        console.log(
            "CARRELLO CONTIENE CODICE 2025:",
            html.includes("2025")
        );

        console.log(
            "CARRELLO CONTIENE VINO SANGIOVESE:",
            html.includes(
                "VINO SANGIOVESE"
            )
        );

        const articoli = [];

        /*
         * Struttura reale:
         *
         * <div
         *   data-entryid="5863"
         *   data-quantity="3,000000"
         *   id="17480"
         *   class="ecCartCustomComp-cartTableRow ... incart row">
         */

        const regex =
            /<div\b[^>]*data-entryid=["']([^"']+)["'][^>]*data-quantity=["']([^"']+)["'][^>]*id=["']([^"']+)["'][^>]*class=["'][^"']*ecCartCustomComp-cartTableRow[^"']*["'][^>]*>/gi;

        let match;

        while (
            (match = regex.exec(html)) !== null
        ) {

            const productId =
                match[1];

            const quantita =
                match[2];

            const rowId =
                match[3];

            articoli.push({

                productId,

                quantita,

                rowId

            });

        }

        console.log(
            "ARTICOLI TROVATI:",
            articoli.length
        );

        console.dir(
            articoli,
            {
                depth: null
            }
        );

        return {

            successo: true,

            status:
                risposta.status,

            puntoVenditaId:
                String(puntoVenditaId),

            lunghezzaHTML:
                html.length,

            numeroArticoli:
                articoli.length,

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

            puntoVenditaId:
                String(puntoVenditaId),

            status:
                errore.response?.status ||
                null,

            errore:
                errore.message,

            numeroArticoli: 0,

            articoli: []

        };

    }

}


// =====================================================
// TROVA PRODOTTO NEL CARRELLO
// =====================================================

async function trovaProdottoNelCarrello(
    puntoVenditaId,
    productId
) {

    console.log(
        "=== CERCA PRODOTTO NEL CARRELLO ==="
    );

    console.log(
        "PUNTO VENDITA:",
        puntoVenditaId
    );

    console.log(
        "PRODUCT ID:",
        productId
    );

    try {

        const risultato =
            await contaArticoliCarrelloTiscali(
                puntoVenditaId
            );

        if (!risultato.successo) {

            return {

                trovato: false,

                puntoVenditaId:
                    String(puntoVenditaId),

                productId:
                    String(productId),

                quantita: 0,

                rowId: null,

                errore:
                    risultato.errore ||
                    "Errore lettura carrello"

            };

        }

        const prodotto =
            risultato.articoli.find(
                articolo =>
                    String(
                        articolo.productId
                    ) ===
                    String(productId)
            );

        if (!prodotto) {

            console.log(
                "PRODOTTO NON TROVATO:",
                productId
            );

            return {

                trovato: false,

                puntoVenditaId:
                    String(puntoVenditaId),

                productId:
                    String(productId),

                quantita: 0,

                rowId: null

            };

        }

        const quantitaNumerica =
            parseFloat(
                String(
                    prodotto.quantita
                ).replace(
                    ",",
                    "."
                )
            );

        console.log(
            "PRODOTTO TROVATO:",
            prodotto
        );

        return {

            trovato: true,

            puntoVenditaId:
                String(puntoVenditaId),

            productId:
                String(
                    prodotto.productId
                ),

            quantita:
                isNaN(
                    quantitaNumerica
                )
                    ? 0
                    : quantitaNumerica,

            rowId:
                prodotto.rowId

        };

    } catch (errore) {

        console.error(
            "ERRORE TROVA PRODOTTO:",
            errore.message
        );

        return {

            trovato: false,

            puntoVenditaId:
                String(puntoVenditaId),

            productId:
                String(productId),

            quantita: 0,

            rowId: null,

            errore:
                errore.message

        };

    }

}


// =====================================================
// EXPORT
// =====================================================

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

