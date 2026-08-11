const db = require("./database");


db.all(
    "SELECT * FROM punti_vendita",
    [],
    (err, righe) => {

        if (err) {

            console.log(err);

        } else {

            console.log(righe);

        }

        db.close();

    }
);
