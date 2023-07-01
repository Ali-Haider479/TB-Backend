const pgp = require("pg-promise")();

const db = pgp({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// db.any("SELECT datname FROM pg_database WHERE datistemplate = false")
//   .then((databases) => {
//     console.log("Connected to PostgreSQL. List of databases:");
//     databases.forEach((db) => console.log(db.datname));

//     // Perform any further operations or start your server here
//   })
//   .catch((error) => {
//     console.error("Error connecting to PostgreSQL:", error);
//   });

db.any("SELECT datname FROM pg_database WHERE datistemplate = false")
  .then((databases) => {
    console.log("Connected to PostgreSQL. List of databases:");
    databases.forEach((db) => console.log(db.datname));

    // Query to list all tables in the current database
    db.any(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
    )
      .then((tables) => {
        console.log("List of tables:");
        tables.forEach((table) => console.log(table.table_name));
      })
      .catch((error) => {
        console.error("Error retrieving tables:", error);
      });

    // Perform any further operations or start your server here
  })
  .catch((error) => {
    console.error("Error connecting to PostgreSQL:", error);
  });

module.exports = db;

// const { Pool } = require("pg");

// const pool = new Pool({
//   user: "alihaider",
//   host: "localhost",
//   database: "tradingbot",
//   password: "11223344",
//   port: 5432,
// });

// // pool.query("SELECT NOW()", (err, res) => {
// //   console.log(res);
// //   if (err) {
// //     console.error("Error running query", err);
// //   } else {
// //     console.log(
// //       "Successful connection to the DB. Server time:",
// //       res.rows[0].now
// //     );
// //   }
// //   // pool.end() // if you want to close the db connection
// // });

// pool.connect((err, client, done) => {
//   if (err) {
//     console.error("Error connecting to PostgreSQL:", err);
//     return;
//   }

//   // Connection successful, execute query to list all databases
//   client.query(
//     "SELECT datname FROM pg_database WHERE datistemplate = false;",
//     (err, res) => {
//       done(); // Release the client back to the pool

//       if (err) {
//         console.error("Error running query:", err);
//         return;
//       }

//       console.log("Connected to PostgreSQL. List of databases:");
//       res.rows.forEach((row) => {
//         console.log(row.datname);
//       });

//       // Perform any further operations or start your server here
//     }
//   );
// });

// module.exports = pool;
