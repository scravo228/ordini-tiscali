const ordineCorrente = require("./ordineCorrente");


function aggiungiProdotto(codice, quantita) {

    const prodottoEsistente = ordineCorrente.prodotti.find(
        prodotto => prodotto.codice === codice
    );


    if (prodottoEsistente) {

        prodottoEsistente.quantita = quantita;

    } else {

        ordineCorrente.prodotti.push({
            codice: codice,
            quantita: quantita
        });

    }

    return ordineCorrente;

}



function eliminaProdotto(codice) {

    ordineCorrente.prodotti =
        ordineCorrente.prodotti.filter(
            prodotto => prodotto.codice !== codice
        );

    return ordineCorrente;

}



function azzeraOrdine() {

    ordineCorrente.prodotti = [];

    return ordineCorrente;

}
function modificaQuantita(codice, quantita) {

    const prodotto = ordineCorrente.prodotti.find(
        prodotto => prodotto.codice === codice
    );


    if (prodotto) {

        prodotto.quantita = quantita;

    }


    return ordineCorrente;

}



module.exports = {

    aggiungiProdotto,
    modificaQuantita,
    eliminaProdotto,
    azzeraOrdine

};