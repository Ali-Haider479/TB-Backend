const db = require("../../config/db");
// import db from "../../config/db";/
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { USDMClient, MainClient } = require("binance");
const ccxt = require("ccxt");

const cryptoSymbols = [
  "BTC", // Bitcoin
  "ETH", // Ethereum
  "XRP", // Ripple
  "BCH", // Bitcoin Cash
  "LTC", // Litecoin
  "ADA", // Cardano
  "DOT", // Polkadot
  "LINK", // Chainlink
  "XLM", // Stellar
  "DOGE", // Dogecoin
  "USDT", // Tether
  "BNB", // Binance Coin
  "XMR", // Monero
  "UNI", // Uniswap
  "EOS", // EOS
  "TRX", // TRON
  "XTZ", // Tezos
  "VET", // VeChain
  "DASH", // Dash
  "ZEC", // Zcash
];

// exports.getAllPortfolioByUserId = (req, res) => {
//   const userId = parseInt(req.params.id);

//   db.any(
//     "SELECT * FROM portfolios WHERE exchange_id IN (SELECT id FROM exchanges WHERE user_id = $1)",
//     [userId]
//   )
//     .then((resp) => {
//       res.status(200).json(resp);
//     })
//     .catch((error) => {
//       res.status(500).json({ error: "Error connecting to PostgreSQL:", error });
//     });
// };

exports.getAllPortfolioByUserId = async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const exchanges = await db.any(
      "SELECT * FROM exchanges WHERE user_id = $1",
      [userId]
    );

    const exchangeAssets = await Promise.all(
      exchanges.map(async (exchange) => {
        const assets = await getExchangeAsset({
          exchangeName: exchange.exchange_name,
          exchangeType: exchange.exchange_type,
          apiKey: exchange.api_key,
          secretKey: exchange.secret_key,
        });

        const portfolios = await db.any(
          "SELECT * FROM portfolios WHERE exchange_id = $1",
          [exchange.id]
        );

        return {
          exchange,
          assets: assets,
          portfolios,
        };
      })
    );

    res.status(200).json(exchangeAssets);
  } catch (error) {
    res.status(500).json({ error: "Error connecting to PostgreSQL:", error });
  }
};

exports.getExchangePortfolio = (req, res) => {
  const id = parseInt(req.params.id);
  db.any("SELECT * FROM portfolios WHERE exchange_id = $1", [id])
    .then((resp) => {
      res.status(200).json(resp);
    })
    .catch((error) => {
      res.status(500).json("Error connecting to PostgreSQL:", error);
    });
};

exports.getPortfolios = (req, res) => {
  db.any("SELECT * FROM portfolios ORDER BY id ASC")
    .then((resp) => {
      res.status(200).json(resp);
    })
    .catch((error) => {
      res.status(500).json("Error connecting to PostgreSQL:", error);
    });
};

exports.deletePortfolio = async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    await db.none("DELETE FROM portfolios WHERE id = $1", [id]);
    res.status(200).send(`User deleted with ID: ${id}`);
  } catch (error) {
    res
      .status(500)
      .send({ message: "An error occurred while deleting user", error });
  }
};

const getExchangeAsset = async (exchange) => {
  console.log("get assets", exchange);
  let client;

  if (exchange?.exchangeType === "Binance Futures Testnet") {
    console.log("Testnet");
    const baseUrl = "https://testnet.binancefuture.com";
    client = new USDMClient({
      api_key: exchange?.apiKey,
      api_secret: exchange?.secretKey,
      baseUrl,
      recvWindow: 10000,
    });
  }
  if (exchange?.exchangeType === "Binance Futures") {
    console.log("Futures");
    client = new USDMClient({
      api_key: exchange?.apiKey,
      api_secret: exchange?.secretKey,
      recvWindow: 10000,
    });
  }
  if (exchange?.exchangeType === "Binance Spot") {
    console.log("Spot");
    client = new MainClient();
  }

  const binance = new ccxt.binance();

  try {
    let result;
    if (exchange?.exchangeName === "Binance Spot") {
      console.log("Testing new server.");
      await fetch("https://binance1.herokuapp.com/api/binance/balances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exchange),
      })
        .then((response) => response.json())
        .then((data) => {
          result = data.filter((item) => cryptoSymbols.includes(item.coin));
          // result = data;
          console.log("Result from server: ", data);
        })
        .catch((error) => {
          console.error("Error:", error);
        });

      console.log("getBalance result: ", result);
    } else {
      result = await client.getBalance();
      console.log("getBalance result: ", result);
    }
    // const result = await client.getBalance();
    // console.log("getBalance result: ", result);

    //   const transformedResult = [];

    if (exchange?.exchangeName === "Binance Spot") {
      console.log("spot is", result);
      // const newResult = result.filter(exchange=> exchange.free !== "0")
      for (const asset of result) {
        if (asset.coin === "USDT") {
          asset["usdt_price"] = +asset.free;
          asset["asset"] = asset.coin;
        } else {
          // const symbol = asset.coin;
          try {
            const symbol = `${asset.coin}/USDT`;

            const ticker = await binance.fetchTicker(symbol);
            const usdtPrice = ticker.last;
            const usdtBalance = parseFloat(asset.free) * usdtPrice;
            asset["usdt_price"] = usdtBalance;
            asset["asset"] = asset.coin;
          } catch (err) {
            console.log(err);
          }
        }
        const { asset: coin_name, balance: quantity, usdt_price } = asset;
        //   transformedResult.push({ coin_name, quantity, usdt_price });
      }
    } else {
      for (const asset of result) {
        if (asset.asset === "USDT") {
          asset["usdt_price"] = asset.balance;
        } else {
          const symbol = `${asset.asset}/USDT`;
          const ticker = await binance.fetchTicker(symbol);
          const usdtPrice = ticker.last;
          const usdtBalance = parseFloat(asset.balance) * usdtPrice;
          asset["usdt_price"] = usdtBalance;
        }
        const { asset: coin_name, balance: quantity, usdt_price } = asset;
        //   transformedResult.push({ coin_name, quantity, usdt_price });
      }
    }
    // console.log(transformedResult);
    return result;
  } catch (err) {
    console.error("getBalance error: ", err);
  }
};
