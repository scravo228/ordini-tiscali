let prodotti = [];
let ordineId = null;
let puntoVenditaId = 1;
let indiceCorrente = 0;


async function apriOrdine(){

    const risposta = await fetch(
        "http://localhost:3000/ordine/apri",
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                puntoVenditaId:puntoVenditaId
            })
        }
    );


    const dati = await risposta.json();


    ordineId = dati.ordineId;


    console.log(
        "Ordine aperto:",
        ordineId
    );

}


// CARICAMENTO EXCEL
async function caricaExcel(){

    const input = document.getElementById("fileExcel");

    const file = input.files[0];


    if(!file){

        alert("Seleziona un file Excel");

        return;

    }


    const formData = new FormData();

    formData.append("file", file);


    const risposta = await fetch(
        "http://localhost:3000/upload-excel",
        {
            method:"POST",
            body:formData
        }
    );


    const dati = await risposta.json();
console.log(dati.prodotti[0]);


    let vecchiProdotti =
JSON.parse(localStorage.getItem("prodottiTiscali")) || [];


// mantiene le quantità già inserite
prodotti = dati.prodotti.map(nuovo => {


    const vecchio =
    vecchiProdotti.find(
        p => p.codice === nuovo.codice
    );


    return {

        ...nuovo,

        quantita:
        vecchio ? vecchio.quantita : 0

    };


});


// salva la nuova lista aggiornata
localStorage.setItem(
    "prodottiTiscali",
    JSON.stringify(prodotti)
);


    mostraProdotti();

}



// MOSTRA PRODOTTI
function mostraProdotti(){

    const lista = document.getElementById("listaProdotti");

    lista.innerHTML = "";


    prodotti.forEach((p,index)=>{


        const div = document.createElement("div");

        div.className = 
p.quantita > 0 
? "prodotto ordinato" 
: "prodotto";


        div.innerHTML=`

        <h3>${p.codice}</h3>

        <p>${p.descrizione}</p>

        <small>${p.unita}</small>


        <div class="quantita">

            <button onclick="meno(${index})">
            -
            </button>


            <span>
            ${p.quantita}
            </span>


            <button onclick="piu(${index})">
            +
            </button>

        </div>

        `;


        lista.appendChild(div);
aggiornaRiepilogo();


    });

}



// AUMENTA QUANTITA'
async function piu(index){

    prodotti[index].quantita++;


    await fetch(
        "http://localhost:3000/ordine/prodotto",
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({

                ordineId: ordineId,

                codice: prodotti[index].codice,

                descrizione: prodotti[index].descrizione,

                quantita: prodotti[index].quantita

            })
        }
    );


    salvaMemoria();

    mostraProdotti();

}// DIMINUISCE QUANTITA'
async function meno(index){

    if(prodotti[index].quantita > 1){

        prodotti[index].quantita--;


        await fetch(
            "http://localhost:3000/ordine/prodotto",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({

                    ordineId: ordineId,

                    codice: prodotti[index].codice,

                    quantita: prodotti[index].quantita

                })
            }
        );


    } else {


        await fetch(
            "http://localhost:3000/ordine/elimina-prodotto",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({

                    ordineId: ordineId,

                    codice: prodotti[index].codice

                })
            }
        );


        prodotti[index].quantita = 0;

    }


    salvaMemoria();

    mostraProdotti();

}
// SALVA STATO ORDINE
function salvaMemoria(){

    localStorage.setItem(
        "prodottiTiscali",
        JSON.stringify(prodotti)
    );


    localStorage.setItem(
        "ultimoArticolo",
        indiceCorrente
    );

}


// AZZERA ORDINE
async function azzeraOrdine(){

    await fetch(
        "http://localhost:3000/ordine/azzera",
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                ordineId: ordineId
            })
        }
    );


    prodotti.forEach(p=>{

        p.quantita = 0;

    });


    salvaMemoria();

    mostraProdotti();

}


// CERCA PRODOTTI
function filtraProdotti(){


    const testo =
    document
    .getElementById("cerca")
    .value
    .toLowerCase();


    const soloOrdinati =
    document
    .getElementById("soloOrdinati")
    .checked;



    document
    .querySelectorAll(".prodotto")
    .forEach((elemento,index)=>{


        const prodotto =
        prodotti[index];


        const contieneTesto =
        elemento.innerText
        .toLowerCase()
        .includes(testo);



        const ordinato =
        prodotto.quantita > 0;



        if(
            contieneTesto &&
            (!soloOrdinati || ordinato)
        ){

            elemento.style.display="block";

        }
        else{

            elemento.style.display="none";

        }


    });

}


// CARICA AUTOMATICAMENTE ALL'APERTURA
window.onload = function(){


    const salvati =
    localStorage.getItem("prodottiTiscali");


    if(salvati){


        prodotti =
        JSON.parse(salvati);


        mostraProdotti();


    }


};



// CREAZIONE PDF
async function creaPDF(){


    const risposta = await fetch(
        "http://localhost:3000/crea-pdf",
        {
            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body: JSON.stringify({
                prodotti: prodotti
            })
        }
    );


    if(!risposta.ok){

        alert("Errore nella creazione del PDF");

        return;

    }


    const blob =
    await risposta.blob();


    const url =
    window.URL.createObjectURL(blob);


    const link =
    document.createElement("a");


    link.href = url;

    link.download =
    "Ordine_Tiscali.pdf";


    document.body.appendChild(link);


    link.click();


    document.body.removeChild(link);


}
function vaiAlRiepilogo(){

    const riepilogo =
    document.getElementById("riepilogo");


    if(riepilogo){

        riepilogo.scrollIntoView({
            behavior: "smooth"
        });

    }

}
function aggiornaRiepilogo(){

    const riepilogo =
    document.getElementById("riepilogo");


    riepilogo.innerHTML = "";


    const ordinati =
    prodotti.filter(
        p => p.quantita > 0
    );


    if(ordinati.length === 0){

        riepilogo.innerHTML = `
            <p>Nessun prodotto ordinato</p>
        `;

        return;

    }


    riepilogo.innerHTML = `
        <h2>Riepilogo ordine</h2>
    `;


    let quantitaTotale = 0;


    ordinati.forEach(p=>{


        quantitaTotale += Number(p.quantita);


        riepilogo.innerHTML += `

        <div class="rigaOrdine">

            <strong>
            ${p.codice}
            </strong>


            <p>
            ${p.descrizione}
            </p>


            <small>
            ${p.unita || ""}
            </small>


            <p>
            Quantità:
            <b>${p.quantita}</b>
            </p>


        </div>

        <hr>

        `;


    });


    riepilogo.innerHTML += `

    <h3>
    Totale articoli:
    ${ordinati.length}
    </h3>


    <h3>
    Quantità totale:
    ${quantitaTotale}
    </h3>

    `;

}

   async function mostraRiepilogo(){

    const risposta = await fetch(
        `http://localhost:3000/ordine/riepilogo/${ordineId}`
    );

    const ordine = await risposta.json();

    const riepilogo =
    document.getElementById("riepilogoOrdine");


    riepilogo.innerHTML =
    "<h2>Riepilogo ordine</h2>";


    if(!ordine.prodotti || ordine.prodotti.length === 0){

        riepilogo.innerHTML +=
        "<p>Nessun prodotto ordinato</p>";

        return;
    }


    ordine.prodotti.forEach(p=>{

       riepilogo.innerHTML += `

<div>

    <strong>${p.codice}</strong>

    <p>
    ${p.descrizione}
    </p>

    <p>
    Quantità: ${p.quantita}
    </p>

        </div>

        `;

    });

}
window.onload = function(){

    apriOrdine();


    let salvati =
    localStorage.getItem("prodottiTiscali");


    if(salvati){

        prodotti = JSON.parse(salvati);

        mostraProdotti();

    }

};
function vaiAlRiepilogo(){

    const riepilogo =
    document.getElementById("riepilogo");


    if(riepilogo){

        riepilogo.scrollIntoView({
            behavior: "smooth"
        });

    }

}
async function testaAggiuntaTiscali() {

    const prodotto = prodotti.find(
        p => p.codice === "Z0005"
    );

    if (!prodotto) {

        alert("Z0005 non trovato nella lista");

        return;

    }

    console.log("Cerco su Tiscali:", prodotto.codice);


    const dati = new URLSearchParams();

    dati.append("_pageId", "315");
    dati.append("_pageType", "page");
    dati.append("_filterId", "1469");

    dati.append(
        "_filters",
        `codice=${prodotto.codice}&titolo=`
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


    const risposta = await fetch(
        "https://www.tiscaliformaggi.com/Async/Filter/ExecuteFilter",
        {
            method: "POST",

            credentials: "include",

            headers: {
                "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8"
            },

            body: dati
        }
    );


    console.log(
        "Status Tiscali:",
        risposta.status
    );


    const risultato =
        await risposta.text();


    console.log(
        "Risposta Tiscali:",
        risultato
    );

}
async function inviaATiscali() {

    if (!prodotti || prodotti.length === 0) {

        alert("Nessun prodotto da aggiungere.");

        return;
    }

    const ordinati =
        prodotti.filter(
            p => Number(p.quantita) > 0
        );

    if (ordinati.length === 0) {

        alert("Non ci sono prodotti con quantità.");

        return;
    }

    const conferma = confirm(
        "Aggiungere al carrello Tiscali i prodotti presenti nell'ordine?"
    );

    if (!conferma) {
        return;
    }

    try {

        console.log("=================================");
        console.log("INVIO REALE A TISCALI");
        console.log(
            "PRODOTTI DA AGGIUNGERE:",
            ordinati.length
        );
        console.log("=================================");

        const risposta = await fetch(
            "http://localhost:3000/invia-ordine-tiscali",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    prodotti: ordinati
                })
            }
        );

        const risultato =
            await risposta.json();

        console.log(
            "RISULTATO INVIO TISCALI:",
            risultato
        );

        if (
            !risposta.ok ||
            !risultato.successo
        ) {

            let errore =
                risultato.errore ||
                "Uno o più prodotti non sono stati aggiunti.";

            alert(
                "Errore durante l'aggiunta al carrello.\n\n" +
                errore
            );

            return;
        }

        alert(
            "✅ Prodotti aggiunti al carrello Tiscali.\n\n" +
            "Prodotti aggiunti: " +
            risultato.prodottiAggiunti +
            "\n\n" +
            "Ora puoi aprire il carrello sul sito Tiscali e controllare l'ordine."
        );

    } catch (errore) {

        console.error(
            "ERRORE INVIO TISCALI:",
            errore
        );

        alert(
            "❌ Impossibile collegarsi al server."
        );

    }

}

window.inviaATiscali = inviaATiscali;