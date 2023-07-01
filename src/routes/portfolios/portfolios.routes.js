const express = require("express");
const router = express.Router();
const portfoliosController = require("./portfolios.controller");

//Create Exchange
// router.post("/:id", exchangesController.createExchange);
// //Verify User Email
// router.patch("/verify-email", exchangesController.verifyUserEmail);
// //Login User
// router.post("/login", exchangesController.loginUser);
// Get all Portfolios of different Exchanges that has same user_id
router.get("/user/:id", portfoliosController.getAllPortfolioByUserId);
// Get Portfolio of an Exchange
router.get("/:id", portfoliosController.getExchangePortfolio);
//List all Portfolios
router.get("/", portfoliosController.getPortfolios);
//Delete an Portfolio
router.delete("/:id", portfoliosController.deletePortfolio);

module.exports = router;
