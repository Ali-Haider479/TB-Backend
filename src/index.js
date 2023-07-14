const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const usersRoutes = require("./routes/users/users.routes");
const exchangesRoutes = require("./routes/exchanges/exchanges.routes");
const portfoliosRoutes = require("./routes/portfolios/portfolios.routes");
const balanceHistoryRoutes = require("./routes/balance_history/balance_history.routes");
const assetsRoutes = require("./routes/assets/assets.routes");

const cors = require("cors");

const app = express();
const port = 8080;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// register routes
app.use("/users", usersRoutes);
app.use("/exchanges", exchangesRoutes);
app.use("/portfolios", portfoliosRoutes);
app.use("/balance-history", balanceHistoryRoutes);
app.use("/assets", assetsRoutes);

// "/" route
app.get("/", (req, res) => {
  res.send("v1.0.0");
});

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});
