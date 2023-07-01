const express = require("express");
const router = express.Router();
const balanceHistoryController = require("./balance_history.controller");

// Get all BalanceHistory through Portfolios of different Exchanges that has same user_id
router.get(
  "/user/:id",
  balanceHistoryController.getAllLatestBalanceHistoryByUserId
);
//List all BalanceHistory
router.get("/", balanceHistoryController.getBalanceHistory);
//Delete an BalanceHistory
router.delete("/:id", balanceHistoryController.deleteBalanceHistory);

module.exports = router;
