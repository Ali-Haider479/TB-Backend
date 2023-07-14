const db = require("../../config/db");
// import db from "../../config/db";/
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.getAllLatestBalanceHistoryByUserId = async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const exchanges = await db.any(
      "SELECT * FROM exchanges WHERE user_id = $1",
      [userId]
    );

    const exchangeBalanceHistory = await Promise.all(
      exchanges.map(async (exchange) => {
        const portfolio = await db.one(
          "SELECT * FROM portfolios WHERE exchange_id = $1",
          [exchange.id]
        );

        const balanceHistoryEntry = await db.oneOrNone(
          "SELECT * FROM balance_history WHERE portfolio_id = $1 ORDER BY date DESC LIMIT 1",
          [portfolio.id]
        );

        return {
          exchange,
          portfolioId: portfolio.id,
          balanceHistory: balanceHistoryEntry,
        };
      })
    );

    res.status(200).json(exchangeBalanceHistory);
  } catch (error) {
    res.status(500).json({ error: "Error connecting to PostgreSQL:", error });
  }
};

exports.getAssets = (req, res) => {
  db.any("SELECT * FROM assets ORDER BY id ASC")
    .then((resp) => {
      res.status(200).json(resp);
    })
    .catch((error) => {
      res.status(500).json("Error connecting to PostgreSQL:", error);
    });
};

exports.deleteBalanceHistory = async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    await db.none("DELETE FROM balance_history WHERE id = $1", [id]);
    res.status(200).send(`User deleted with ID: ${id}`);
  } catch (error) {
    res
      .status(500)
      .send({ message: "An error occurred while deleting user", error });
  }
};
