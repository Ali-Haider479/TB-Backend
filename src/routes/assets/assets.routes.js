const express = require("express");
const router = express.Router();
const assetsController = require("./assets.controller");

// router.get(
//   "/portfolio/:id",
//   assetsController.getAllLatestBalanceHistoryByUserId
// );
//List all BalanceHistory
router.get("/", assetsController.getAssets);
//Delete an BalanceHistory
// router.delete("/:id", assetsController.deleteBalanceHistory);

module.exports = router;
