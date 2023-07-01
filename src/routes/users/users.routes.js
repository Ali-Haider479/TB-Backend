const express = require("express");
const router = express.Router();
const usersController = require("./users.controller");

//Register User
router.post("/register", usersController.createUser);
//Verify User Email
router.patch("/verify-email", usersController.verifyUserEmail);
//Login User
router.post("/login", usersController.loginUser);
//List all Users
router.get("/", usersController.getUsers);
//Delete a User
router.delete("/:id", usersController.deleteUser);

module.exports = router;
