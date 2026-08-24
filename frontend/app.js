// =====================================================
// VARIABILI GLOBALI
// =====================================================

let contenutoOrdine = "";
let schermataOrdineSalvata = "";
let prodotti = [];
let ordineId = null;

let puntoVenditaId =
    Number(
        localStorage.getItem("puntoVenditaId")
    ) || null;

console.log(
    "ID PUNTO VENDITA CARICATO:",
    puntoVenditaId
);


// =====================================================
// API
// =====================================================

const API_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:3000"
        : "https://ordini-tiscali.onrender.com";


// =====================================================
// CARICA LISTA PRODOTTI ONLINE
// =====================================================

async function caricaListaOnline() {

    try {

        const risposta = await fetch(
            `${API_URL}/prodotti`
        );

        const dati = await risposta.json();

        if (!risposta.ok || !dati.successo) {

            throw new Error(
                dati.errore ||
                "Errore caricamento lista prodotti"
            );

        }

        prodotti =
            dati.prodotti || [];

        // Garantisce che ogni prodotto abbia una quantità
        prodotti.forEach(
            prodotto => {

                if (
                    typeof prodotto.quantita !== "number"
                ) {

                    prodotto.quantita = 0;

                }

            }
        );

        console.log(
            "LISTA PRODOTTI CARICATA ONLINE:",
            prodotti.length
        );

        mostraProdotti();

        return true;

    } catch (errore) {

        console.error(
            "Errore caricamento lista online:",
            errore
        );

        prodotti = [];

        mostraProdotti();

        alert(
            "Impossibile caricare la lista prodotti online."
        );

        return false;

    }

}


// =====================================================
// APERTURA ORDINE + SINCRONIZZAZIONE
// =====================================================

async function apriOrdine() {

    if (!puntoVenditaId) {

        alert(
            "Nessun punto vendita collegato. Effettua il login."
        );

        return false;

    }

    try {

        const risposta = await fetch(
            `${API_URL}/ordine/apri`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    puntoVenditaId: puntoVenditaId
                })
            }
        );


        const dati = await risposta.json();


        if (
            !risposta.ok ||
            !dati.ordineId
        ) {

            console.error(
                "Errore apertura ordine:",
                dati
            );

            alert(
                "Impossibile aprire l'ordine."
            );

            return false;

        }


        // =================================================
        // SALVA ID ORDINE
        // =================================================

        ordineId =
            dati.ordineId;


        console.log(
            "Ordine aperto:",
            ordineId
        );


        // =================================================
        // RECUPERA ORDINE DAL DATABASE
        // =================================================

        const rispostaOrdine =
            await fetch(
                `${API_URL}/ordine/${puntoVenditaId}`
            );


        const ordine =
            await rispostaOrdine.json();


        if (
            !rispostaOrdine.ok ||
            !ordine
        ) {

            console.error(
                "Errore caricamento ordine:",
                ordine
            );

            return true;

        }


        console.log(
            "ORDINE RECUPERATO DA SUPABASE:",
            ordine
        );


        // =================================================
        // SINCRONIZZA LE QUANTITÀ
        // =================================================

        if (
            Array.isArray(ordine.prodotti)
        ) {

            ordine.prodotti.forEach(
                prodottoDatabase => {

                    const prodotto =
                        prodotti.find(
                            p =>
                                String(p.codice) ===
                                String(prodottoDatabase.codice)
                        );


                    if (prodotto) {

                        prodotto.quantita =
                            Number(
                                prodottoDatabase.quantita || 0
                            );

                    }

                }
            );

        }


        // =================================================
        // AGGIORNA SCHERMATA
        // =================================================

        mostraProdotti();


        console.log(
            "ORDINE SINCRONIZZATO:",
            prodotti
        );


        return true;


    } catch (errore) {

        console.error(
            "Errore apertura/sincronizzazione ordine:",
            errore
        );

        alert(
            "Impossibile collegarsi al server."
        );

        return false;

    }

}


// =====================================================
// CARICAMENTO EXCEL
// =====================================================

async function caricaExcel() {

    console.log(
        "CARICA EXCEL PREMUTO"
    );

    const input =
        document.getElementById(
            "fileExcel"
        );

    const file =
        input.files[0];

    if (!file) {

        alert(
            "Seleziona un file Excel."
        );

        return;

    }

    try {

        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );


        const risposta =
            await fetch(
                `${API_URL}/upload-excel`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const dati =
            await risposta.json();


        console.log(
            "RISPOSTA RICEVUTA:",
            dati
        );

        console.log(
            "PRODOTTI RICEVUTI:",
            dati.prodotti?.length
        );


        if (
            !risposta.ok ||
            !dati.successo
        ) {

            alert(
                dati.errore ||
                "Errore durante il caricamento del file."
            );

            return;

        }


        /*
         * Manteniamo eventuali modifiche locali
         * al codice prodotto durante il caricamento
         * di un nuovo Excel.
         */

        const vecchiProdotti =
            JSON.parse(
                localStorage.getItem(
                    "prodottiTiscali"
                )
            ) || [];


        prodotti =
            (dati.prodotti || []).map(
                nuovo => {

                    const vecchio =
                        vecchiProdotti.find(
                            p =>
                                p.codice ===
                                    nuovo.codice ||
                                p.codiceOriginale ===
                                    nuovo.codice
                        );


                    if (vecchio) {

                        return {

                            ...nuovo,

                            codice:
                                vecchio.codice,

                            quantita:
                                vecchio.quantita || 0,

                            codiceOriginale:
                                vecchio.codiceOriginale ||
                                nuovo.codice

                        };

                    }


                    return {

                        ...nuovo,

                        quantita: 0

                    };

                }
            );


        console.log(
            "LISTA NUOVA RICEVUTA:",
            prodotti
        );


        console.log(
            "NUMERO PRODOTTI:",
            prodotti.length
        );


        mostraProdotti();


        console.log(
            "Prodotti caricati:",
            prodotti.length
        );


    } catch (errore) {

        console.error(
            "Errore caricamento Excel:",
            errore
        );

        alert(
            "Errore durante il caricamento del file."
        );

    }

}


window.testCarica =
    function () {

        alert(
            "TEST OK"
        );

    };


console.log(
    "CARICA EXCEL ESPORTATA"
);


// =====================================================
// VISUALIZZAZIONE PRODOTTI
// =====================================================

function mostraProdotti() {

    const lista =
        document.getElementById(
            "listaProdotti"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML = "";


    prodotti.forEach(
        (prodotto, index) => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                Number(prodotto.quantita) > 0
                    ? "prodotto ordinato"
                    : "prodotto";

                    div.dataset.index = index;


            div.innerHTML = `

                <div class="codice-prodotto">

                    <strong id="codice-${index}">
                        ${prodotto.codice}
                    </strong>

                    <button
                        type="button"
                        onclick="modificaCodice(${index})"
                    >
                        ✏️
                    </button>

                </div>


                <p>
                    ${prodotto.descrizione}
                </p>


                <small>
                    ${prodotto.unita || ""}
                </small>


                <div class="quantita">

    <button
        type="button"
        onclick="meno(${index})"
    >
        -
    </button>


    <input
        type="number"
        min="0"
        value="${prodotto.quantita || 0}"
        onchange="modificaQuantita(${index}, this.value)"
    >


    <button
        type="button"
        onclick="piu(${index})"
    >
        +
    </button>

</div>

            `;


            lista.appendChild(
                div
            );

        }
    );


    aggiornaContatori();

}


// =====================================================
// MODIFICA CODICE PRODOTTO
// =====================================================

async function modificaCodice(index) {

    const prodotto =
        prodotti[index];


    if (!prodotto) {
        return;
    }


    const nuovoCodice =
        prompt(
            "Modifica codice articolo:",
            prodotto.codice
        );


    if (nuovoCodice === null) {
        return;
    }


    const codicePulito =
        nuovoCodice.trim();


    if (!codicePulito) {

        alert(
            "Il codice non può essere vuoto."
        );

        return;

    }


    // Se il codice non è cambiato
    if (
        codicePulito ===
        String(prodotto.codice)
    ) {

        return;

    }


    const codicePrecedente =
        prodotto.codice;


    try {

        console.log(
            "Salvataggio nuovo codice:",
            codicePrecedente,
            "→",
            codicePulito
        );


        const risposta =
            await fetch(
                `${API_URL}/prodotti/modifica-codice`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        id:
                            prodotto.id,

                        nuovoCodice:
                            codicePulito

                    })

                }
            );


        const dati =
            await risposta.json();


        if (
            !risposta.ok ||
            !dati.successo
        ) {

            throw new Error(
                dati.errore ||
                "Errore salvataggio codice"
            );

        }


        // =================================================
        // SALVATAGGIO RIUSCITO
        // =================================================

        if (!prodotto.codiceOriginale) {

            prodotto.codiceOriginale =
                codicePrecedente;

        }


        prodotto.codice =
            codicePulito;


        console.log(
            "CODICE SALVATO CORRETTAMENTE:",
            codicePrecedente,
            "→",
            codicePulito
        );


        mostraProdotti();


        alert(
            "✅ Codice prodotto aggiornato."
        );


    } catch (errore) {

        console.error(
            "Errore modifica codice:",
            errore
        );


        alert(
            "❌ Impossibile salvare il nuovo codice."
        );

    }

}


// =====================================================
// AUMENTA QUANTITÀ
// =====================================================

async function piu(index) {

    if (!ordineId) {

        const aperto =
            await apriOrdine();


        if (!aperto) {

            alert(
                "Impossibile aprire l'ordine."
            );

            return;

        }

    }


    const prodotto =
        prodotti[index];


    if (!prodotto) {
        return;
    }


    prodotto.quantita =
        Number(prodotto.quantita || 0) + 1;


    try {

        const risposta =
            await fetch(
                `${API_URL}/ordine/prodotto`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        ordineId:
                            ordineId,

                        codice:
                            prodotto.codice,

                        descrizione:
                            prodotto.descrizione,

                        quantita:
                            prodotto.quantita

                    })
                }
            );


        const dati =
            await risposta.json();


        if (!risposta.ok) {

            throw new Error(
                dati.errore ||
                "Errore salvataggio prodotto"
            );

        }


        salvaMemoria();

        mostraProdotti();


    } catch (errore) {

        console.error(
            "Errore aumento quantità:",
            errore
        );


        prodotto.quantita--;


        mostraProdotti();


        alert(
            "Impossibile aggiornare l'ordine."
        );

    }

}


// =====================================================
// DIMINUISCE QUANTITÀ
// =====================================================

async function meno(index) {

    if (!ordineId) {

        alert(
            "L'ordine non è ancora aperto."
        );

        return;

    }


    const prodotto =
        prodotti[index];


    if (!prodotto) {
        return;
    }


    // =================================================
    // QUANTITÀ MAGGIORE DI 1
    // =================================================

    if (
        Number(prodotto.quantita) > 1
    ) {

        prodotto.quantita--;


        try {

            const risposta =
                await fetch(
                    `${API_URL}/ordine/prodotto/modifica`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            ordineId:
                                ordineId,

                            codice:
                                prodotto.codice,

                            quantita:
                                prodotto.quantita

                        })
                    }
                );


            const dati =
                await risposta.json();


            if (!risposta.ok) {

                throw new Error(
                    dati.errore ||
                    "Errore modifica quantità"
                );

            }


            salvaMemoria();

            mostraProdotti();


        } catch (errore) {

            console.error(
                "Errore diminuzione quantità:",
                errore
            );


            prodotto.quantita++;


            mostraProdotti();


            alert(
                "Impossibile modificare la quantità."
            );

        }


        return;

    }


    // =================================================
    // QUANTITÀ = 1 → ELIMINA PRODOTTO
    // =================================================

    try {

        const risposta =
            await fetch(
                `${API_URL}/ordine/prodotto/elimina`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        ordineId:
                            ordineId,

                        codice:
                            prodotto.codice

                    })
                }
            );


        const dati =
            await risposta.json();


        if (!risposta.ok) {

            throw new Error(
                dati.errore ||
                "Errore eliminazione prodotto"
            );

        }


        prodotto.quantita = 0;


        salvaMemoria();

        mostraProdotti();


    } catch (errore) {

        console.error(
            "Errore eliminazione prodotto:",
            errore
        );


        alert(
            "Impossibile eliminare il prodotto."
        );

    }

}

// =====================================================
// MODIFICA QUANTITÀ MANUALE
// =====================================================

async function modificaQuantita(index, valore) {

    const prodotto =
        prodotti[index];


    if (!prodotto) {
        return;
    }


    let nuovaQuantita =
        Number(valore);


    // =================================================
    // CONTROLLO VALORE
    // =================================================

    if (
        !Number.isFinite(nuovaQuantita) ||
        nuovaQuantita < 0
    ) {

        alert(
            "Inserisci una quantità valida."
        );

        mostraProdotti();

        return;

    }


    // Le quantità devono essere numeri interi
    nuovaQuantita =
        Math.floor(nuovaQuantita);


    const quantitaPrecedente =
        Number(
            prodotto.quantita || 0
        );


    // Nessuna modifica
    if (
        nuovaQuantita ===
        quantitaPrecedente
    ) {

        return;

    }


    // =================================================
    // QUANTITÀ = 0
    // =================================================

    if (
        nuovaQuantita === 0
    ) {

        if (!ordineId) {

            prodotto.quantita = 0;

            mostraProdotti();

            return;

        }


        try {

            const risposta =
                await fetch(
                    `${API_URL}/ordine/prodotto/elimina`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            ordineId:
                                ordineId,

                            codice:
                                prodotto.codice

                        })

                    }
                );


            const dati =
                await risposta.json();


            if (!risposta.ok) {

                throw new Error(
                    dati.errore ||
                    "Errore eliminazione prodotto"
                );

            }


            prodotto.quantita = 0;

            mostraProdotti();


        } catch (errore) {

            console.error(
                "Errore modifica quantità:",
                errore
            );


            alert(
                "❌ Impossibile modificare la quantità."
            );


            mostraProdotti();

        }


        return;

    }


    // =================================================
    // ORDINE NON ANCORA APERTO
    // =================================================

    if (!ordineId) {

        const aperto =
            await apriOrdine();


        if (!aperto) {

            alert(
                "Impossibile aprire l'ordine."
            );

            mostraProdotti();

            return;

        }

    }


    // =================================================
    // SALVA NUOVA QUANTITÀ
    // =================================================

    try {

        const risposta =
            await fetch(
                `${API_URL}/ordine/prodotto/modifica`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        ordineId:
                            ordineId,

                        codice:
                            prodotto.codice,

                        quantita:
                            nuovaQuantita

                    })

                }
            );


        const dati =
            await risposta.json();


        if (!risposta.ok) {

            throw new Error(
                dati.errore ||
                "Errore modifica quantità"
            );

        }


        // =================================================
        // AGGIORNA QUANTITÀ LOCALE
        // =================================================

        prodotto.quantita =
            nuovaQuantita;


        salvaMemoria();

        mostraProdotti();


        console.log(
            "QUANTITÀ MODIFICATA:",
            prodotto.codice,
            quantitaPrecedente,
            "→",
            nuovaQuantita
        );


    } catch (errore) {

        console.error(
            "Errore modifica quantità:",
            errore
        );


        // Ripristina il valore precedente
        prodotto.quantita =
            quantitaPrecedente;


        mostraProdotti();


        alert(
            "❌ Impossibile modificare la quantità."
        );

    }

}


// =====================================================
// SALVA STATO LOCALE
// =====================================================

function salvaMemoria() {

    /*
     * La lista principale viene caricata online.
     *
     * Questa funzione rimane per compatibilità
     * con il resto dell'app.
     *
     * NON salva la lista nel localStorage.
     */

}


// =====================================================
// AZZERA ORDINE
// =====================================================

async function azzeraOrdine() {

    if (!ordineId) {

        alert(
            "Nessun ordine aperto."
        );

        return;

    }


    const conferma =
        confirm(
            "Vuoi davvero azzerare l'ordine?"
        );


    if (!conferma) {
        return;
    }


    try {

        const risposta =
            await fetch(
                `${API_URL}/ordine/database/azzera`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        ordineId:
                            ordineId

                    })
                }
            );


        const dati =
            await risposta.json();


        if (!risposta.ok) {

            throw new Error(
                dati.errore ||
                "Errore azzeramento ordine"
            );

        }


        prodotti.forEach(
            prodotto => {

                prodotto.quantita = 0;

            }
        );


        mostraProdotti();


        ordineId = null;


        console.log(
            "Ordine azzerato e ordineId resettato"
        );


    } catch (errore) {

        console.error(
            "Errore azzeramento:",
            errore
        );


        alert(
            "Impossibile azzerare l'ordine."
        );

    }

}


// =====================================================
// RICERCA E FILTRO PRODOTTI
// =====================================================

function filtraProdotti() {

    console.log("========== FILTRO ==========");

    const checkbox =
        document.getElementById("soloOrdinati");

    if (!checkbox) {
        console.error("CHECKBOX soloOrdinati NON TROVATA");
        return;
    }

    const soloOrdinati =
        checkbox.checked;

    console.log(
        "Solo ordinati:",
        soloOrdinati
    );

    const elementi =
        document.querySelectorAll(
            "#listaProdotti .prodotto"
        );

    console.log(
        "Elementi trovati:",
        elementi.length
    );

    elementi.forEach((elemento) => {

        const index =
            Number(elemento.dataset.index);

        const prodotto =
            prodotti[index];

        if (!prodotto) {

            elemento.style.display =
                "none";

            return;

        }

        const quantita =
            Number(
                prodotto.quantita || 0
            );

        console.log(
            "Prodotto:",
            prodotto.codice,
            "quantità:",
            quantita
        );

        if (
            soloOrdinati &&
            quantita <= 0
        ) {

            elemento.style.display =
                "none";

        } else {

            elemento.style.display =
                "";

        }

    });

    console.log(
        "========== FINE FILTRO =========="
    );

}


// =====================================================
// RIEPILOGO VISIVO
// =====================================================

function aggiornaContatori() {

    const totale =
        document.getElementById(
            "totaleProdotti"
        );


    const ordinati =
        document.getElementById(
            "prodottiOrdinati"
        );


    const quantita =
        document.getElementById(
            "quantitaTotale"
        );


    if (
        !totale ||
        !ordinati ||
        !quantita
    ) {

        return;

    }


    totale.innerHTML =
        prodotti.length;


    const prodottiOrdinati =
        prodotti.filter(
            p =>
                Number(p.quantita) > 0
        );


    ordinati.innerHTML =
        prodottiOrdinati.length;


    quantita.innerHTML =
        prodottiOrdinati.reduce(
            (
                totale,
                prodotto
            ) =>
                totale +
                Number(
                    prodotto.quantita
                ),
            0
        );

}


// =====================================================
// SCROLL AL RIEPILOGO
// =====================================================

function vaiAlRiepilogo() {

    const riepilogo =
        document.getElementById(
            "riepilogo"
        );


    if (riepilogo) {

        riepilogo.scrollIntoView({
            behavior: "smooth"
        });

    }

}


// =====================================================
// CREAZIONE PDF
// =====================================================

async function creaPDF() {

    try {

        const risposta =
            await fetch(
                `${API_URL}/crea-pdf`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        prodotti:
                            prodotti
                    })
                }
            );


        if (!risposta.ok) {

            alert(
                "Errore nella creazione del PDF."
            );

            return;

        }


        const blob =
            await risposta.blob();


        const url =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            "Ordine_Tiscali.pdf";


        document.body.appendChild(
            link
        );


        link.click();


        document.body.removeChild(
            link
        );


        window.URL.revokeObjectURL(
            url
        );


    } catch (errore) {

        console.error(
            "Errore creazione PDF:",
            errore
        );


        alert(
            "Impossibile creare il PDF."
        );

    }

}

// =====================================================
// SCHERMATA INVIO ORDINE
// =====================================================

function mostraSchermataInvio() {

    const schermata =
        document.getElementById(
            "schermataInvio"
        );

    const testo =
        document.getElementById(
            "testoInvio"
        );

    if (!schermata) {
        return;
    }

    schermata.style.display =
        "flex";

    if (testo) {

        testo.innerHTML =
            "Connessione a Tiscali...";

    }


    // Cambia automaticamente il messaggio
    // mentre il server sta lavorando

    setTimeout(() => {

        if (schermata.style.display === "flex") {

            testo.innerHTML =
                "Accesso a Tiscali...";

        }

    }, 2500);


    setTimeout(() => {

        if (schermata.style.display === "flex") {

            testo.innerHTML =
                "Ricerca dei prodotti...";

        }

    }, 5000);


    setTimeout(() => {

        if (schermata.style.display === "flex") {

            testo.innerHTML =
                "Inserimento prodotti nel carrello...";

        }

    }, 8000);


    setTimeout(() => {

        if (schermata.style.display === "flex") {

            testo.innerHTML =
                "Quasi terminato...";

        }

    }, 15000);

}


// =====================================================
// NASCONDE SCHERMATA INVIO
// =====================================================

function nascondiSchermataInvio() {

    const schermata =
        document.getElementById(
            "schermataInvio"
        );

    if (!schermata) {
        return;
    }

    schermata.style.display =
        "none";

}


// =====================================================
// INVIO ORDINE REALE A TISCALI
// =====================================================

async function inviaATiscali() {

    if (!ordineId) {

        alert(
            "Nessun ordine aperto."
        );

        return;

    }


   // =================================================
// SINCRONIZZA LE QUANTITÀ SCRITTE A MANO
// =================================================

const inputsQuantita =
    document.querySelectorAll(
        "#listaProdotti .quantita input[type='number']"
    );

const aggiornamenti = [];

inputsQuantita.forEach(input => {

    const prodottoElement =
        input.closest(".prodotto");

    if (!prodottoElement) {
        return;
    }

    const index =
        Number(prodottoElement.dataset.index);

    const prodotto =
        prodotti[index];

    if (!prodotto) {
        return;
    }

    let quantita =
        Number(input.value);

    if (
        !Number.isFinite(quantita) ||
        quantita < 0
    ) {
        quantita = 0;
    }

    quantita =
        Math.floor(quantita);

    const quantitaAttuale =
        Number(prodotto.quantita || 0);

    // Se non è cambiata non facciamo nulla
    if (
        quantita ===
        quantitaAttuale
    ) {
        return;
    }

    // Aggiorna subito la memoria locale
    prodotto.quantita =
        quantita;


    // =================================================
    // SALVA LA QUANTITÀ SUL DATABASE
    // =================================================

    if (quantita === 0) {

        aggiornamenti.push(

            fetch(
                `${API_URL}/ordine/prodotto/elimina`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        ordineId:
                            ordineId,

                        codice:
                            prodotto.codice

                    })
                }
            )
            .then(async risposta => {

                const dati =
                    await risposta.json();

                if (!risposta.ok) {

                    throw new Error(
                        dati.errore ||
                        "Errore eliminazione prodotto"
                    );

                }

            })

        );

    } else {

        aggiornamenti.push(

            fetch(
                `${API_URL}/ordine/prodotto/modifica`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        ordineId:
                            ordineId,

                        codice:
                            prodotto.codice,

                        quantita:
                            quantita

                    })
                }
            )
            .then(async risposta => {

                const dati =
                    await risposta.json();

                if (!risposta.ok) {

                    throw new Error(
                        dati.errore ||
                        "Errore salvataggio quantità"
                    );

                }

            })

        );

    }

});


// =================================================
// ATTENDE TUTTI I SALVATAGGI
// =================================================

try {

    await Promise.all(
        aggiornamenti
    );

} catch (errore) {

    console.error(
        "Errore sincronizzazione quantità:",
        errore
    );

    alert(
        "❌ Non è stato possibile salvare tutte le quantità dell'ordine."
    );

    return;

}


// =================================================
// CALCOLA NUOVAMENTE I PRODOTTI ORDINATI
// =================================================

const ordinati =
    prodotti.filter(
        p =>
            Number(p.quantita) > 0
    );


    console.log("========== CONTROLLO INVIO ==========");
console.log("ORDINE ID:", ordineId);
console.log("PRODOTTI:", prodotti);
console.log("ORDINATI:", ordinati);
console.log("======================================");

if (ordinati.length === 0) {

    alert(
        "Non ci sono prodotti con quantità."
    );

    return;

}


    const conferma =
        confirm(
            "Inviare l'ordine a Tiscali?\n\n" +
            "Prodotti: " +
            ordinati.length
        );


    if (!conferma) {
        return;
    }


    // Mostra schermata di avanzamento
mostraSchermataInvio();


    try {

        console.log(
            "Invio ordine Tiscali:",
            ordineId
        );


        const risposta =
            await fetch(
                `${API_URL}/ordine/invia-tiscali`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        ordineId:
                            ordineId

                    })
                }
            );


        const risultato =
            await risposta.json();


        console.log(
            "Risultato invio Tiscali:",
            risultato
        );


        // =================================================
        // ERRORE GENERALE
        // =================================================

        if (
            !risposta.ok &&
            !risultato.risultati
        ) {

            alert(
                "❌ Errore durante l'invio.\n\n" +
                (
                    risultato.errore ||
                    "Errore comunicazione con il server."
                )
            );


            nascondiSchermataInvio();

            return;

        }


        // =================================================
        // PRODOTTI NON TROVATI
        // =================================================

        const prodottiNonTrovati =
            (risultato.risultati || [])
                .filter(
                    prodotto =>
                        prodotto.trovato === false
                );


        // =================================================
        // PRODOTTI CON ERRORE
        // =================================================

        const prodottiConErrore =
            (risultato.risultati || [])
                .filter(
                    prodotto =>
                        prodotto.trovato === true &&
                        prodotto.aggiunto === false &&
                        prodotto.modalitaTest !== true
                );


        // =================================================
        // TUTTO OK
        // =================================================

        if (
            risultato.successo &&
            prodottiNonTrovati.length === 0 &&
            prodottiConErrore.length === 0
        ) {

            alert(
                "✅ Ordine inviato correttamente a Tiscali!\n\n" +
                "Prodotti inviati: " +
                risultato.prodottiInviati +
                "\n" +
                "Prodotti aggiunti: " +
                risultato.prodottiAggiunti
            );

            nascondiSchermataInvio();

            return;

        }


        // =================================================
        // ORDINE PARZIALE
        // =================================================

        let messaggio =
            "⚠️ Ordine inviato parzialmente.\n\n";


        messaggio +=
            "Prodotti aggiunti: " +
            (
                risultato.prodottiAggiunti ||
                0
            );


        if (
            prodottiNonTrovati.length > 0
        ) {

            messaggio +=
                "\n\n❌ Prodotti non trovati:\n";


            messaggio +=
                prodottiNonTrovati
                    .map(
                        prodotto =>
                            prodotto.codice
                    )
                    .join("\n");

        }


        if (
            prodottiConErrore.length > 0
        ) {

            messaggio +=
                "\n\n❌ Errore aggiunta prodotti:\n";


            messaggio +=
                prodottiConErrore
                    .map(
                        prodotto =>
                            prodotto.codice
                    )
                    .join("\n");

        }


        alert(
            messaggio
        );


        nascondiSchermataInvio();


    } catch (errore) {

        console.error(
            "Errore invio Tiscali:",
            errore
        );


        nascondiSchermataInvio();


        alert(
            "❌ Impossibile collegarsi al server."
        );

    }

}


window.inviaATiscali =
    inviaATiscali;


// =====================================================
// USCITA ACCOUNT
// =====================================================

function esciAccount() {

    const conferma =
        confirm(
            "Vuoi uscire dall'account e cambiare punto vendita?"
        );


    if (!conferma) {
        return;
    }


    localStorage.removeItem(
        "puntoVendita"
    );


    localStorage.removeItem(
        "puntoVenditaId"
    );


    localStorage.removeItem(
        "puntoVenditaNome"
    );


    localStorage.removeItem(
        "ruolo"
    );


    document.getElementById(
        "app"
    ).style.display = "none";


    document.getElementById(
        "schermataLogin"
    ).style.display = "block";

}


// =====================================================
// AVVIO APP
// =====================================================

window.onload =
    async function () {

        console.log(
            "Avvio Ordini Tiscali..."
        );

        // =====================================================
// RISVEGLIO RENDER
// Un solo ping all'apertura dell'app
// =====================================================

fetch(`${API_URL}/ping`)
    .then(() => {

        console.log(
            "PING RENDER OK"
        );

    })
    .catch(() => {

        console.log(
            "PING RENDER: server in risveglio"
        );

    });


        const utente =
            localStorage.getItem(
                "puntoVendita"
            );


        // =================================================
        // NESSUN LOGIN
        // =================================================

        if (!utente) {

            console.log(
                "Nessun account salvato."
            );

            return;

        }


        // =================================================
        // RECUPERA ACCOUNT
        // =================================================

        try {

            const dati =
                JSON.parse(
                    utente
                );


            document.getElementById(
                "schermataLogin"
            ).style.display = "none";


            document.getElementById(
                "app"
            ).style.display = "block";


            const puntoVendita =
                document.getElementById(
                    "puntoVendita"
                );


            if (puntoVendita) {

                puntoVendita.innerHTML =
                    dati.nome || "";

            }


            // =================================================
            // AMMINISTRATORE
            // =================================================

            if (
                dati.ruolo ===
                "amministratore"
            ) {

                localStorage.setItem(
                    "amministratoreId",
                    dati.amministratoreId
                );


                document.getElementById(
                    "app"
                ).style.display = "block";


                mostraAdmin();


                return;

            }


            // =================================================
            // CARICA LISTA
            // =================================================

            await caricaListaOnline();


            // =================================================
            // APRE ORDINE
            // =================================================

            await apriOrdine();


        } catch (errore) {

            console.error(
                "Errore avvio app:",
                errore
            );

            localStorage.removeItem(
                "puntoVendita"
            );

            localStorage.removeItem(
                "puntoVenditaId"
            );

            document.getElementById(
                "app"
            ).style.display = "none";


            document.getElementById(
                "schermataLogin"
            ).style.display = "block";

        }

    };


// =====================================================
// LOGIN
// =====================================================

async function effettuaLogin() {

    const codice =
        document.getElementById(
            "codiceLogin"
        ).value.trim();


    const password =
        document.getElementById(
            "passwordLogin"
        ).value.trim();


    const elementoErrore =
        document.getElementById(
            "erroreLogin"
        );


    try {

        const risposta =
            await fetch(
                `${API_URL}/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        codice,
                        password

                    })
                }
            );


        const dati =
            await risposta.json();


        if (
            !risposta.ok ||
            !dati.successo
        ) {

            elementoErrore.innerHTML =
                "❌ Codice o password errati";

            return;

        }


        // =================================================
        // SALVA PUNTO VENDITA
        // =================================================

        localStorage.setItem(
            "puntoVenditaId",
            dati.puntoVenditaId
        );


        puntoVenditaId =
            Number(
                dati.puntoVenditaId
            );


        console.log(
            "ID PUNTO VENDITA SALVATO:",
            dati.puntoVenditaId
        );


        localStorage.setItem(
            "puntoVenditaNome",
            dati.nome
        );


        localStorage.setItem(
            "ruolo",
            dati.ruolo
        );


        localStorage.setItem(
            "puntoVendita",
            JSON.stringify(
                dati
            )
        );


        // =================================================
        // NASCONDE LOGIN
        // =================================================

        document.getElementById(
            "schermataLogin"
        ).style.display = "none";


        // =================================================
        // AMMINISTRATORE
        // =================================================

        if (
            dati.ruolo ===
            "amministratore"
        ) {

            localStorage.setItem(
                "amministratoreId",
                dati.amministratoreId
            );


            console.log(
                "ID AMMINISTRATORE SALVATO:",
                dati.amministratoreId
            );


            document.getElementById(
                "app"
            ).style.display = "block";


            mostraAdmin();


            console.log(
                "Login amministratore effettuato:",
                dati
            );


            return;

        }


        // =================================================
        // UTENTE NORMALE
        // =================================================

        document.getElementById(
            "app"
        ).style.display = "block";


        contenutoOrdine =
            document.getElementById(
                "app"
            ).innerHTML;


        const puntoVendita =
            document.getElementById(
                "puntoVendita"
            );


        if (puntoVendita) {

            puntoVendita.innerHTML =
                dati.nome;

        }


        console.log(
            "Login effettuato:",
            dati
        );


        // =================================================
        // CARICA LISTA E ORDINE
        // =================================================

        await caricaListaOnline();

        await apriOrdine();


    } catch (errore) {

        console.error(
            "Errore login:",
            errore
        );


        elementoErrore.innerHTML =
            "Errore collegamento server";

    }

}


// =====================================================
// PANNELLO AMMINISTRATORE
// =====================================================

function mostraAdmin() {

    document.getElementById(
        "app"
    ).innerHTML = `

    <div class="admin-panel">

        <h1>
            👑 Pannello Amministratore
        </h1>


        <!-- USCITA -->

        <button
            type="button"
            class="btn-esci-admin"
            onclick="esciAccount()"
        >
            🚪 Esci / Cambia account
        </button>


        <!-- CREAZIONE PUNTO VENDITA -->

        <div class="admin-sezione">

            <h2>
                ➕ Nuovo punto vendita
            </h2>


            <input
                id="adminNome"
                placeholder="Nome punto vendita"
            >


            <input
                id="adminCodice"
                placeholder="Codice accesso"
            >


            <input
                id="adminPassword"
                type="password"
                placeholder="Password app"
            >


            <input
                id="adminTiscaliUser"
                placeholder="Username Tiscali"
            >


            <input
                id="adminTiscaliPassword"
                type="password"
                placeholder="Password Tiscali"
            >


            <button
                type="button"
                class="btn-admin-crea"
                onclick="creaNuovoPuntoVendita()"
            >
                ➕ Crea account
            </button>


            <p id="adminMessaggio"></p>

        </div>


        <!-- LISTA PUNTI VENDITA -->

        <div class="admin-sezione">

            <h2>
                🏪 Punti vendita
            </h2>


            <div id="listaPuntiVenditaAdmin">

                Caricamento...

            </div>

        </div>


    </div>

    `;


    document.getElementById(
        "app"
    ).style.display = "block";


    caricaPuntiVenditaAdmin();

}


// =====================================================
// CARICA PUNTI VENDITA ADMIN
// =====================================================

async function caricaPuntiVenditaAdmin() {

    try {

        const risposta =
            await fetch(
                `${API_URL}/admin/punti-vendita`
            );


        const dati =
            await risposta.json();


        if (!dati.successo) {
            return;
        }


        const contenitore =
            document.getElementById(
                "listaPuntiVenditaAdmin"
            );


        if (!contenitore) {
            return;
        }


        contenitore.innerHTML =
            "";


        dati.punti.forEach(
            punto => {

                contenitore.innerHTML += `

<div class="box-punto">

    🏪 <strong>
        ${punto.nome}
    </strong>

    <br>

    🔑 Codice:
    ${punto.codice}

    <br>

    Stato:
    ${
        punto.attivo
            ? "🟢 Attivo"
            : "🔴 Disattivo"
    }

    <br><br>


    <button
        onclick="apriModificaPuntoVendita(${punto.id})"
    >
        ✏️ Modifica
    </button>


    ${
        punto.attivo
            ?
            `
            <button
                onclick="disattivaPuntoVendita(${punto.id})"
            >
                🔴 Disattiva
            </button>
            `
            :
            ""
    }


    ${
        !punto.attivo
            ?
            `
            <button
                onclick="riattivaPuntoVendita(${punto.id})"
            >
                🟢 Riattiva
            </button>
            `
            :
            ""
    }


</div>

`;

            }
        );


    } catch (errore) {

        console.error(
            "Errore caricamento punti:",
            errore
        );

    }

}


// =====================================================
// CREA NUOVO PUNTO VENDITA
// =====================================================

async function creaNuovoPuntoVendita() {

    const nome =
        document.getElementById(
            "adminNome"
        ).value;


    const codice =
        document.getElementById(
            "adminCodice"
        ).value;


    const password =
        document.getElementById(
            "adminPassword"
        ).value;


    const tiscaliUsername =
        document.getElementById(
            "adminTiscaliUser"
        ).value;


    const tiscaliPassword =
        document.getElementById(
            "adminTiscaliPassword"
        ).value;


    const amministratoreId =
        localStorage.getItem(
            "amministratoreId"
        );


    try {

        const risposta =
            await fetch(
                `${API_URL}/admin/crea-punto-vendita`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        amministratoreId,

                        nome,

                        codice,

                        password,

                        tiscaliUsername,

                        tiscaliPassword

                    })

                }
            );


        const dati =
            await risposta.json();


        if (
            !risposta.ok ||
            !dati.successo
        ) {

            document.getElementById(
                "adminMessaggio"
            ).innerHTML =
                "❌ " +
                (
                    dati.errore ||
                    "Errore creazione account"
                );

            return;

        }


        document.getElementById(
            "adminMessaggio"
        ).innerHTML =
            "✅ Punto vendita creato!";


        console.log(
            "Nuovo punto vendita:",
            dati
        );


        caricaPuntiVenditaAdmin();


    } catch (errore) {

        console.error(
            "Errore creazione punto vendita:",
            errore
        );


        document.getElementById(
            "adminMessaggio"
        ).innerHTML =
            "❌ Errore collegamento server";

    }

}


// =====================================================
// DISATTIVA PUNTO VENDITA
// =====================================================

async function disattivaPuntoVendita(id) {

    if (
        !confirm(
            "Disattivare questo punto vendita?"
        )
    ) {

        return;

    }


    try {

        const risposta =
            await fetch(
                `${API_URL}/admin/disattiva-punto-vendita`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        id: id
                    })

                }
            );


        const dati =
            await risposta.json();


        if (dati.successo) {

            alert(
                "Punto vendita disattivato"
            );


            caricaPuntiVenditaAdmin();

        }


    } catch (errore) {

        console.error(
            errore
        );

    }

}


// =====================================================
// RIATTIVA PUNTO VENDITA
// =====================================================

async function riattivaPuntoVendita(id) {

    try {

        const risposta =
            await fetch(
                `${API_URL}/admin/riattiva-punto-vendita`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        id: id
                    })

                }
            );


        const dati =
            await risposta.json();


        if (dati.successo) {

            alert(
                "✅ Punto vendita riattivato"
            );


            caricaPuntiVenditaAdmin();

        }


    } catch (errore) {

        console.error(
            "Errore riattivazione:",
            errore
        );

    }

}


// =====================================================
// MODIFICA PUNTO VENDITA
// =====================================================

async function apriModificaPuntoVendita(id) {

    try {

        const risposta =
            await fetch(
                `${API_URL}/admin/punti-vendita`
            );


        const dati =
            await risposta.json();


        const punto =
            dati.punti.find(
                p =>
                    p.id === id
            );


        if (!punto) {
            return;
        }


        document.getElementById(
            "app"
        ).innerHTML = `

            <h1>
                ✏️ Modifica punto vendita
            </h1>


            <input
                id="modNome"
                value="${punto.nome}"
            >


            <input
                id="modCodice"
                value="${punto.codice}"
            >


            <input
                id="modPassword"
                placeholder="Nuova password"
            >


            <input
                id="modTiscaliUser"
                placeholder="Username Tiscali"
            >


            <input
                id="modTiscaliPassword"
                placeholder="Password Tiscali"
            >


            <button
                onclick="salvaModificaPuntoVendita(${id})"
            >
                💾 Salva
            </button>


            <button
                onclick="mostraAdmin()"
            >
                ⬅️ Indietro
            </button>

        `;


    } catch (errore) {

        console.error(
            "Errore apertura modifica:",
            errore
        );

        alert(
            "Errore caricamento punto vendita."
        );

    }

}


// =====================================================
// SALVA MODIFICA PUNTO VENDITA
// =====================================================

async function salvaModificaPuntoVendita(id) {

    const nome =
        document.getElementById(
            "modNome"
        ).value;


    const codice =
        document.getElementById(
            "modCodice"
        ).value;


    const password =
        document.getElementById(
            "modPassword"
        ).value;


    const tiscaliUsername =
        document.getElementById(
            "modTiscaliUser"
        ).value;


    const tiscaliPassword =
        document.getElementById(
            "modTiscaliPassword"
        ).value;


    try {

        const risposta =
            await fetch(
                `${API_URL}/admin/modifica-punto-vendita`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        id,

                        nome,

                        codice,

                        password,

                        tiscaliUsername,

                        tiscaliPassword

                    })

                }
            );


        const dati =
            await risposta.json();


        if (dati.successo) {

            alert(
                "✅ Account modificato"
            );


            mostraAdmin();


        } else {

            alert(
                "❌ Errore modifica"
            );

        }


    } catch (errore) {

        console.error(
            "Errore modifica:",
            errore
        );


        alert(
            "Errore collegamento server"
        );

    }

}


// =====================================================
// MIO ACCOUNT
// =====================================================

async function mostraMioAccount() {

    const id =
        localStorage.getItem(
            "puntoVenditaId"
        );


    if (!id) {

        alert(
            "Nessun punto vendita collegato"
        );

        return;

    }


    try {

        const risposta =
            await fetch(
                `${API_URL}/account/${id}`
            );


        const dati =
            await risposta.json();


        if (!dati.successo) {

            alert(
                "Impossibile caricare account"
            );

            return;

        }


        const punto =
            dati.puntoVendita;


        document.getElementById(
            "app"
        ).innerHTML = `

        <div class="admin-panel">

            <h1>
                👤 Il mio account
            </h1>


            <h2>
                🏪 ${punto.nome}
            </h2>


            <p>
                Codice:
                <strong>
                    ${punto.codice}
                </strong>
            </p>


            <label>
                Nuova password app
            </label>


            <input
                type="password"
                id="mioPassword"
                placeholder="Lascia vuoto per non cambiare"
            >


            <label>
                Username Tiscali
            </label>


            <input
                type="text"
                id="mioTiscaliUsername"
                value="${punto.tiscaliUsername || ""}"
            >


            <label>
                Password Tiscali
            </label>


            <input
                type="password"
                id="mioTiscaliPassword"
                value="${punto.tiscaliPassword || ""}"
            >


            <br><br>


            <button
                onclick="salvaMioAccount()"
            >
                💾 Salva modifiche
            </button>


            <button
                onclick="tornaOrdine()"
            >
                ⬅️ Torna ordine
            </button>


            <p id="messaggioAccount"></p>

        </div>

        `;


    } catch (errore) {

        console.error(
            "Errore caricamento account:",
            errore
        );


        alert(
            "Errore collegamento server"
        );

    }

}


// =====================================================
// SALVA MIO ACCOUNT
// =====================================================

async function salvaMioAccount() {

    const id =
        localStorage.getItem(
            "puntoVenditaId"
        );


    const password =
        document.getElementById(
            "mioPassword"
        ).value;


    const tiscaliUsername =
        document.getElementById(
            "mioTiscaliUsername"
        ).value;


    const tiscaliPassword =
        document.getElementById(
            "mioTiscaliPassword"
        ).value;


    try {

        const risposta =
            await fetch(
                `${API_URL}/account/modifica`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        id,

                        password,

                        tiscaliUsername,

                        tiscaliPassword

                    })

                }
            );


        const dati =
            await risposta.json();


        if (dati.successo) {

            const messaggio =
                document.getElementById(
                    "messaggioAccount"
                );


            if (messaggio) {

                messaggio.innerHTML =
                    "✅ Account aggiornato";

            }


        } else {

            alert(
                "Errore aggiornamento account"
            );

        }


    } catch (errore) {

        console.error(
            "Errore aggiornamento account:",
            errore
        );


        alert(
            "Errore collegamento server"
        );

    }

}


// =====================================================
// TORNA ALL'ORDINE
// =====================================================

function tornaOrdine() {

    location.reload();

}


// =====================================================
// ESPORTAZIONI GLOBALI
// =====================================================

window.creaNuovoPuntoVendita =
    creaNuovoPuntoVendita;

window.effettuaLogin =
    effettuaLogin;

window.inviaATiscali =
    inviaATiscali;

window.caricaExcel =
    caricaExcel;

window.modificaCodice =
    modificaCodice;

window.piu =
    piu;

window.meno =
    meno;

window.azzeraOrdine =
    azzeraOrdine;

window.filtraProdotti =
    filtraProdotti;

window.vaiAlRiepilogo =
    vaiAlRiepilogo;

window.creaPDF =
    creaPDF;

window.esciAccount =
    esciAccount;

window.mostraMioAccount =
    mostraMioAccount;

window.salvaMioAccount =
    salvaMioAccount;

window.tornaOrdine =
    tornaOrdine;

window.apriModificaPuntoVendita =
    apriModificaPuntoVendita;

window.salvaModificaPuntoVendita =
    salvaModificaPuntoVendita;

window.disattivaPuntoVendita =
    disattivaPuntoVendita;

window.riattivaPuntoVendita =
    riattivaPuntoVendita;

    window.modificaQuantita =
    modificaQuantita;


console.log(
    "APP JS CARICATO FINO ALLA FINE"
);


