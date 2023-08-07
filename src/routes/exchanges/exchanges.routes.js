const express = require("express");
const router = express.Router();
const exchangesController = require("./exchanges.controller");

//Create Exchange
router.post("/:id", exchangesController.createExchange);
// //Verify User Email
// router.patch("/verify-email", exchangesController.verifyUserEmail);
// //Login User
// router.post("/login", exchangesController.loginUser);
//Get User's all Exchanges without Assets
router.get(
  "/without-asset/:id",
  exchangesController.getUserExchangesWithoutAssets
);
//Get User's all Exchanges
router.get("/:id", exchangesController.getUserExchanges);
//Get single Exchanges
router.get("/single/:id", exchangesController.getSingleExchanges);
//List all Exchanges
router.get("/", exchangesController.getExchanges);
//Delete an Exchange
router.delete("/:id", exchangesController.deleteExchange);

module.exports = router;
