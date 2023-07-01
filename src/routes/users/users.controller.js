const db = require("../../config/db");
// import db from "../../config/db";/
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.createUser = async (req, res) => {
  const { firstName, lastName, email, password, phone_no } = req.body;

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Generate verification code
  const verification_key = Math.floor(Math.random() * 90000) + 10000;

  try {
    // Check if a user with the provided email already exists
    const user = await db.oneOrNone("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user) {
      return res
        .status(400)
        .json("Email is already in use. Please try another.");
    }

    // If no user was found, create a new one
    await db.none(
      "INSERT INTO users (first_name, last_name, email, password, phone_no, verification_key) VALUES ($1, $2, $3, $4, $5, $6)",
      [firstName, lastName, email, passwordHash, phone_no, verification_key]
    );

    res
      .status(200)
      .json({ firstName, lastName, email, phone_no, verification_key });
  } catch (error) {
    res
      .status(500)
      .json({ message: "There was an error processing your request.", error });
  }
};

exports.verifyUserEmail = async (req, res) => {
  const { email, verificationKey } = req.body;
  console.log(req.body);

  try {
    const user = await db.oneOrNone("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    console.log(user);

    if (user && user.verification_key == verificationKey) {
      await db.none(
        "UPDATE users SET account_verified = $1, verification_key = $2 WHERE id = $3",
        [true, null, user.id]
      );

      const userForToken = {
        username: user.username,
        id: user.id,
      };

      const token = jwt.sign(userForToken, "jwt");
      res
        .status(200)
        .json({ message: "User verification successful", token, user });
    } else {
      res.status(400).json({ message: "Invalid Code! Try Again." });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred during verification.", error });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.one("SELECT * FROM users WHERE email = $1", [email]);
    const passwordCorrect =
      user === null ? false : await bcrypt.compare(password, user.password);

    if (!(user && passwordCorrect)) {
      return res.status(401).json({
        error: "Invalid username or password.",
      });
    }

    if (!user.account_verified) {
      return res.status(401).json({
        error: "Account not verified.",
      });
    }

    const userForToken = {
      email: user.email,
      id: user.id,
    };

    const token = jwt.sign(userForToken, "jwt");
    console.log(user);

    const responseBody = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      token,
    };
    console.log(responseBody);

    res.status(200).send({ ...responseBody });
  } catch (error) {
    console.log(error);
    res.status(500).json("Something went wrong");
  }
};

exports.getUsers = (req, res) => {
  db.any("SELECT * FROM users ORDER BY id ASC")
    .then((resp) => {
      res.status(200).json(resp);
    })
    .catch((error) => {
      res.status(500).json("Error connecting to PostgreSQL:", error);
    });
};

// exports.updateUser = (req, res) => {
//   const id = parseInt(req.params.id);
//   const { username, email } = req.body;

//   pool.query(
//     "UPDATE users SET username = $1, email = $2 WHERE id = $3",
//     [username, email, id],
//     (error) => {
//       if (error) {
//         throw error;
//       }
//       res.status(200).send(`User modified with ID: ${id}`);
//     }
//   );
// };

exports.deleteUser = async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    await db.none("DELETE FROM users WHERE id = $1", [id]);
    res.status(200).send(`User deleted with ID: ${id}`);
  } catch (error) {
    res
      .status(500)
      .send({ message: "An error occurred while deleting user", error });
  }
};
