
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
// APERTURA ORDINE
// =====================================================

async function apriOrdine() {
    if (!puntoVenditaId) {

    alert(
        "Nessun punto vendita collegato. Effettua il login."
    );

    return;

}

    try {

        const risposta = await fetch(
            "https://ordini-tiscali.onrender.com/ordine/apri",
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

        if (!risposta.ok || !dati.ordineId) {

            console.error(
                "Errore apertura ordine:",
                dati
            );

            alert("Impossibile aprire l'ordine.");

            return false;
        }

        ordineId = dati.ordineId;


        console.log(
            "Ordine aperto:",
            ordineId
        );

        return true;

    } catch (errore) {

        console.error(
            "Errore connessione apertura ordine:",
            errore
        );

        alert(
            "Impossibile collegarsi al server."
        );

        return false;
    }
}
async function mostraMioAccount() {

    if (!schermataOrdineSalvata) {

    schermataOrdineSalvata =
        document.getElementById("app").innerHTML;

}

    const id =
        localStorage.getItem(
            "puntoVenditaId"
        );


    if (!id) {

        alert(
            "Nessun account collegato."
        );

        return;

    }


    try {

        const risposta =
            await fetch(
                `httpsordini-tiscali.onrender.com/admin/punti-vendita`
            );


        const dati =
            await risposta.json();


        const punto =
            dati.punti.find(
                p =>
                    String(p.id) ===
                    String(id)
            );


        if (!punto) {

            alert(
                "Account non trovato."
            );

            return;

        }


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


                <input
                    type="password"
                    id="mioPassword"
                    placeholder="Nuova password app"
                >


                <input
                    type="text"
                    id="mioTiscaliUser"
                    placeholder="Username Tiscali"
                >


                <input
                    type="password"
                    id="mioTiscaliPassword"
                    placeholder="Password Tiscali"
                >


                <button
                    onclick="salvaMioAccount()"
                >
                    💾 Salva modifiche
                </button>


                <button
                    onclick="tornaOrdine()"
                >
                    ⬅️ Torna all'ordine
                </button>


                <p id="mioAccountMessaggio"></p>

            </div>

        `;


    } catch (errore) {

        console.error(
            "Errore caricamento account:",
            errore
        );

        alert(
            "Impossibile caricare l'account."
        );

    }

}

// =====================================================
// CARICAMENTO EXCEL
// =====================================================

async function caricaExcel() {
    
    console.log("CARICA EXCEL PREMUTO");

    const input =
        document.getElementById("fileExcel");

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
        "httpsordini-tiscali.onrender.com/upload-excel",
        {
            method: "POST",
            body: formData
        }
    );

const dati =
    await risposta.json();
    console.log("RISPOSTA RICEVUTA:", dati);
console.log("PRODOTTI RICEVUTI:", dati.prodotti?.length);
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


        const vecchiProdotti =
            JSON.parse(
                localStorage.getItem(
                    "prodottiTiscali"
                )
            ) || [];


        prodotti =
            dati.prodotti.map(
                nuovo => {

                    const vecchio =
                        vecchiProdotti.find(
                            p =>
                                p.codice ===
                                nuovo.codice
                        );


                    return {

                        ...nuovo,

                        quantita:
                            vecchio
                                ? vecchio.quantita
                                : 0

                    };

                }
            );console.log(
    "LISTA NUOVA RICEVUTA:",
    prodotti
);

console.log(
    "NUMERO PRODOTTI:",
    prodotti.length
);


console.log("ARRAY PRODOTTI:", prodotti);

        salvaMemoria();

mostraProdotti();

//aggiornaRiepilogo();


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

window.testCarica = function () {
    alert("TEST OK");
};
console.log("CARICA EXCEL ESPORTATA");


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
                prodotto.quantita > 0
                    ? "prodotto ordinato"
                    : "prodotto";


            div.innerHTML = `

                <h3>
                    ${prodotto.codice}
                </h3>

                <p>
                    ${prodotto.descrizione}
                </p>

                <small>
                    ${prodotto.unita || ""}
                </small>

                <div class="quantita">

                    <button
                        onclick="meno(${index})">
                        -
                    </button>

                    <span>
                        ${prodotto.quantita}
                    </span>

                    <button
                        onclick="piu(${index})">
                        +
                    </button>

                </div>

            `;


            lista.appendChild(div);

        }
    );


   // aggiornaRiepilogo();
    aggiornaContatori();
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


    prodotto.quantita++;


    try {

        const risposta =
            await fetch(
                "httpsordini-tiscali.onrender.com/ordine/prodotto",
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


    // ---------------------------------------------
    // QUANTITÀ MAGGIORE DI 1
    // ---------------------------------------------

    if (prodotto.quantita > 1) {

        prodotto.quantita--;


        try {

            const risposta =
                await fetch(
                    "httpsordini-tiscali.onrender.com/ordine/prodotto/modifica",
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


    // ---------------------------------------------
    // QUANTITÀ = 1 → ELIMINA PRODOTTO
    // ---------------------------------------------

    try {

        const risposta =
            await fetch(
                "httpsordini-tiscali.onrender.com/ordine/prodotto/elimina",
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
// SALVA STATO LOCALE
// =====================================================

function salvaMemoria() {

    localStorage.setItem(
        "prodottiTiscali",
        JSON.stringify(prodotti)
    );

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
                "httpsordini-tiscali.onrender.com/ordine/database/azzera",
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


        salvaMemoria();

        mostraProdotti();


        console.log(
            "Ordine azzerato:",
            ordineId
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
// RICERCA PRODOTTI
// =====================================================

function filtraProdotti() {

    const testo =
        document
            .getElementById("cerca")
            .value
            .toLowerCase();


    const soloOrdinati =
        document
            .getElementById(
                "soloOrdinati"
            )
            .checked;


    document
        .querySelectorAll(
            "#listaProdotti .prodotto"
        )
        .forEach(
            (elemento, index) => {

                const prodotto =
                    prodotti[index];


                const contieneTesto =
                    elemento.innerText
                        .toLowerCase()
                        .includes(testo);


                const ordinato =
                    prodotto.quantita > 0;


                elemento.style.display =
                    contieneTesto &&
                    (
                        !soloOrdinati ||
                        ordinato
                    )
                        ? "block"
                        : "none";

            }
        );

}


// =====================================================
// RIEPILOGO VISIVO
// =====================================================

function aggiornaContatori() {

    const totale =
        document.getElementById("totaleProdotti");

    const ordinati =
        document.getElementById("prodottiOrdinati");

    const quantita =
        document.getElementById("quantitaTotale");


    if (!totale || !ordinati || !quantita) {
        return;
    }


    totale.innerHTML = prodotti.length;


    const prodottiOrdinati =
        prodotti.filter(
            p => Number(p.quantita) > 0
        );


    ordinati.innerHTML =
        prodottiOrdinati.length;


    quantita.innerHTML =
        prodottiOrdinati.reduce(
            (totale, prodotto) =>
                totale + Number(prodotto.quantita),
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
                "httpsordini-tiscali.onrender.com/crea-pdf",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        prodotti: prodotti
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


        link.href = url;

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
// INVIO ORDINE REALE A TISCALI
// =====================================================


async function inviaATiscali() {

    if (!ordineId) {
        alert("Nessun ordine aperto.");
        return;
    }

    const ordinati = prodotti.filter(
        p => Number(p.quantita) > 0
    );

    if (ordinati.length === 0) {
        alert("Non ci sono prodotti con quantità.");
        return;
    }

    const conferma = confirm(
        "Inviare l'ordine a Tiscali?\n\n" +
        "Prodotti: " + ordinati.length
    );

    if (!conferma) {
        return;
    }

    try {

        console.log("Invio ordine Tiscali:", ordineId);

        const risposta = await fetch(
            "httpsordini-tiscali.onrender.com/ordine/invia-tiscali",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    ordineId: ordineId
                })
            }
        );

        const risultato = await risposta.json();

        console.log(
            "Risultato invio Tiscali:",
            risultato
        );

        if (!risposta.ok || !risultato.successo) {

            alert(
                "❌ Errore durante l'invio.\n\n" +
                (risultato.errore ||
                "Uno o più prodotti non sono stati aggiunti.")
            );

            return;
        }

        alert(
            "✅ Ordine inviato correttamente a Tiscali!\n\n" +
            "Prodotti inviati: " +
            risultato.prodottiInviati +
            "\n" +
            "Prodotti aggiunti: " +
            risultato.prodottiAggiunti
        );

    } catch (errore) {

        console.error(
            "Errore invio Tiscali:",
            errore
        );

        alert(
            "❌ Impossibile collegarsi al server."
        );
    }
}

window.inviaATiscali = inviaATiscali;


// =====================================================
// AVVIO APP
// =====================================================

window.onload = async function () {

    console.log(
        "Avvio Ordini Tiscali..."
    );
const utente =
    localStorage.getItem("puntoVendita");

if (utente) {

    const dati =
        JSON.parse(utente);

    document.getElementById(
        "schermataLogin"
    ).style.display = "none";


    document.getElementById(
        "app"
    ).style.display = "block";


    document.getElementById(
        "puntoVendita"
    ).innerHTML =
        dati.nome;

}
    const utenteSalvato =
    localStorage.getItem("puntoVendita");

if (utenteSalvato) {

    const dati =
        JSON.parse(utenteSalvato);

    document.getElementById(
        "schermataLogin"
    ).style.display = "none";


    document.getElementById(
        "app"
    ).style.display = "block";


    document.getElementById(
        "puntoVendita"
    ).innerHTML =
        dati.nome;

}


    // 1. Recupera la lista salvata

    const salvati =
        localStorage.getItem(
            "prodottiTiscali"
        );


    if (salvati) {

        try {

            prodotti =
                JSON.parse(
                    salvati
                );

        } catch (errore) {

            console.error(
                "Errore lettura lista salvata:",
                errore
            );

            prodotti = [];

        }

    }


    // 2. Mostra subito la lista

    mostraProdotti();


    // 3. Apre l'ordine

    await apriOrdine();

};

async function effettuaLogin() {

    const codice =
        document.getElementById(
            "codiceLogin"
        ).value;


    const password =
        document.getElementById(
            "passwordLogin"
        ).value;


    const risposta =
        await fetch(
            "httpsordini-tiscali.onrender.com/login",
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


    if (!dati.successo) {

        document.getElementById(
            "erroreLogin"
        ).innerHTML =
            "❌ Codice o password errati";

        return;

    }


    alert(
        "Accesso effettuato: " +
        dati.nome
    );

}
async function effettuaLogin() {

    const codice =
        document.getElementById("codiceLogin").value.trim();


    const password =
        document.getElementById("passwordLogin").value.trim();


    const errore =
        document.getElementById("erroreLogin");


    try {

        const risposta = await fetch(
            "https://ordini-tiscali.onrender.com/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    codice,
                    password
                })
            }
        );


        const dati =
            await risposta.json();


        if (!dati.successo) {

            errore.innerHTML =
                "❌ Codice o password errati";

            return;

        }


        // salvo il punto vendita sul telefono

        localStorage.setItem(
            "puntoVenditaId",
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
        



        // nascondo login

document.getElementById(
    "schermataLogin"
).style.display = "none";


// salvo ruolo

localStorage.setItem(
    "ruolo",
    dati.ruolo
);

localStorage.setItem(
    "puntoVendita",
    JSON.stringify(dati)
);

// controllo tipo account

if (dati.ruolo === "amministratore") {


    document.getElementById(
        "app"
    ).style.display = "none";


    mostraAdmin();


} else {


    // mostro app ordine normale

    document.getElementById(
        "app"
    ).style.display = "block";

    contenutoOrdine =
    document.getElementById("app").innerHTML;

    console.log("CONTENUTO SALVATO:", contenutoOrdine);


    document.getElementById(
        "puntoVendita"
    ).innerHTML =
        dati.nome;


}


console.log(
    "Login effettuato:",
    dati
);


    } catch (errore) {

        console.error(
            "Errore login:",
            errore
        );


        errore.innerHTML =
            "Errore collegamento server";

    }

}
function mostraAdmin() {

    document.getElementById(
        "app"
    ).innerHTML = `

    <div class="admin-panel">

        <h1>
            👑 Pannello Amministratore
        </h1>


        <h2>
            Crea nuovo punto vendita
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
            placeholder="Password app"
        >


        <input
            id="adminTiscaliUser"
            placeholder="Username Tiscali"
        >


        <input
            id="adminTiscaliPassword"
            placeholder="Password Tiscali"
        >


        <button onclick="creaNuovoPuntoVendita()">

            ➕ Crea account

        </button>


        <p id="adminMessaggio"></p>


        <h2>
            🏪 Punti vendita
        </h2>


        <div id="listaPuntiVenditaAdmin">

            Caricamento...

        </div>


    </div>

    `;


    document.getElementById(
        "app"
    ).style.display = "block";


    caricaPuntiVenditaAdmin();

}
async function caricaPuntiVenditaAdmin() {


    try {


        const risposta =
            await fetch(
                "httpsordini-tiscali.onrender.com/admin/punti-vendita"
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


        contenitore.innerHTML = "";


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
    <button onclick="apriModificaPuntoVendita(${punto.id})">

    ✏️ Modifica

</button>

    ${
        punto.attivo
        ?
        `
        <button onclick="disattivaPuntoVendita(${punto.id})">

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
    <button onclick="riattivaPuntoVendita(${punto.id})">

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
            "puntoVenditaId"
        );



    try {


        const risposta =
            await fetch(
                "httpsordini-tiscali.onrender.com/admin/crea-punto-vendita",
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



        if (!risposta.ok || !dati.successo) {


            document.getElementById(
                "adminMessaggio"
            ).innerHTML =
                "❌ " +
                (dati.errore ||
                "Errore creazione account");


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
                "httpsordini-tiscali.onrender.com/admin/disattiva-punto-vendita",
                {

                    method:"POST",

                    headers:{

                        "Content-Type":
                        "application/json"

                    },

                    body:JSON.stringify({

                        id:id

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
async function apriModificaPuntoVendita(id) {

    const risposta =
        await fetch(
            "httpsordini-tiscali.onrender.com/admin/punti-vendita"
        );

    const dati =
        await risposta.json();

    const punto =
        dati.punti.find(
            p => p.id === id
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

        <input id="modNome" value="${punto.nome}">


    <input id="modCodice"
    value="${punto.codice}"
    >


    <input id="modPassword"
    placeholder="Nuova password"
    >


    <input id="modTiscaliUser"
    placeholder="Username Tiscali"
    >


    <input id="modTiscaliPassword"
    placeholder="Password Tiscali"
    >


    <button onclick="salvaModificaPuntoVendita(${id})">

        💾 Salva

    </button>


    <button onclick="mostraAdmin()">

        ⬅️ Indietro

    </button>


    `;


}
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
                "httpsordini-tiscali.onrender.com/admin/modifica-punto-vendita",
                {

                    method:"POST",

                    headers:{
                        "Content-Type":
                        "application/json"
                    },

                    body:JSON.stringify({

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
async function mostraMioAccount() {

    const id =
        localStorage.getItem(
            "puntoVenditaId"
        );


    if (!id) {

        alert(
            "Nessun account collegato."
        );

        return;

    }


    document.getElementById(
        "app"
    ).innerHTML = `

    <div class="admin-panel">

        <h1>
            👤 Il mio account
        </h1>


        <input
            type="password"
            id="mioPassword"
            placeholder="Nuova password app"
        >


        <input
            type="text"
            id="mioTiscaliUser"
            placeholder="Username Tiscali"
        >


        <input
            type="password"
            id="mioTiscaliPassword"
            placeholder="Password Tiscali"
        >


        <button onclick="salvaMioAccount()">

            💾 Salva modifiche

        </button>


        <button onclick="ricaricaOrdine()">

            ⬅️ Torna ordine

        </button>


    </div>

    `;

}
async function riattivaPuntoVendita(id) {


    const risposta =
        await fetch(
            "httpsordini-tiscali.onrender.com/admin/riattiva-punto-vendita",
            {

                method:"POST",

                headers:{
                    "Content-Type":
                    "application/json"
                },

                body:JSON.stringify({

                    id:id

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

}
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
                `httpsordini-tiscali.onrender.com/account/${id}`
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


            <button onclick="salvaMioAccount()">

                💾 Salva modifiche

            </button>


            <button onclick="tornaOrdine()">

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
async function salvaMioAccount() {


    const id =
        localStorage.getItem(
            "puntoVenditaId"
        );


    const risposta =
        await fetch(
            "httpsordini-tiscali.onrender.com/account/modifica",
            {

                method:"POST",

                headers:{
                    "Content-Type":
                    "application/json"
                },

                body:JSON.stringify({

                    id:id,

                    password:
                    document.getElementById(
                        "mioPassword"
                    ).value,


                    tiscaliUsername:
                    document.getElementById(
                        "mioTiscaliUsername"
                    ).value,


                    tiscaliPassword:
                    document.getElementById(
                        "mioTiscaliPassword"
                    ).value

                })

            }
        );


    const dati =
        await risposta.json();


    if(dati.successo){

        document.getElementById(
            "messaggioAccount"
        ).innerHTML =
            "✅ Account aggiornato";

    } else {

        alert(
            "Errore aggiornamento account"
        );

    }

}


function tornaOrdine() {

    location.reload();

}



window.creaNuovoPuntoVendita =
    creaNuovoPuntoVendita;


window.effettuaLogin = effettuaLogin;


// Rende disponibile il pulsante HTML

window.inviaATiscali =
    inviaATiscali;

window.caricaExcel = caricaExcel;

console.log("APP JS CARICATO FINO ALLA FINE");

