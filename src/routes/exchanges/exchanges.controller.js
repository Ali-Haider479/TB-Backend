const db = require("../../config/db");
// import db from "../../config/db";/
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

exports.createExchange = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    console.log(userId, req.body);
    const { exchangeName, exchangeType, apiKey, secretKey } = req.body;

    const query =
      "INSERT INTO exchanges (exchange_name, exchange_type, api_key, secret_key, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id";
    const values = [exchangeName, exchangeType, apiKey, secretKey, userId];

    const exchange = await db.one(query, values);
    console.log(exchange);
    const exchangeId = exchange.id;
    const assets = await getExchangeAsset(req.body);

    const totalUsdtPrice = assets.reduce((sum, item) => {
      const usdtPrice =
        typeof item.usdt_price === "string"
          ? parseFloat(item.usdt_price)
          : item.usdt_price;
      return sum + usdtPrice;
    }, 0);

    console.log(totalUsdtPrice);

    const portfolioQuery =
      "INSERT INTO portfolios (balance, locked_balance, exchange_id) VALUES ($1, $2, $3) RETURNING id";
    const portfolioValues = [totalUsdtPrice, totalUsdtPrice, exchangeId];
    const portfolio = await db.one(portfolioQuery, portfolioValues);
    const portfolioId = portfolio.id;

    const assetQuery =
      "INSERT INTO assets (coin_name, quantity, usdt_price, portfolio_id) VALUES ($1, $2, $3, $4)";

    const assetValues = assets.map((asset) => [
      `${asset.coin_name}`,
      parseFloat(asset.quantity),
      typeof asset.usdt_price === "string"
        ? parseFloat(asset.usdt_price)
        : asset.usdt_price,
      portfolioId, // Replace `portfolioId` with the actual portfolio ID
    ]);

    await Promise.all(assetValues.map((asset) => db.none(assetQuery, asset)));

    console.log(assetValues);

    // await db.many(assetQuery, assetValues);

    const balanceHistoryQuery =
      "INSERT INTO balance_history (date, balance, portfolio_id) VALUES (current_timestamp, $1, $2)";
    const balanceHistoryValues = [totalUsdtPrice, portfolioId];
    await db.none(balanceHistoryQuery, balanceHistoryValues);

    res.status(201).json({
      exchange: {
        ...exchange,
        exchange_name: exchangeName,
        exchange_type: exchangeType,
        api_key: apiKey,
        secret_key: secretKey,
        userId,
      },
      assets,
    });
  } catch (error) {
    console.error("Error creating exchange:", error);
    res.status(500).json({ error: "Failed to create exchange" });
  }
};

exports.getUserExchanges = async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const exchanges = await db.any(
      "SELECT * FROM exchanges WHERE user_id = $1 ORDER BY id ASC",
      [userId]
    );

    console.log(exchanges);

    const exchangeAssets = await Promise.all(
      exchanges.map(async (exchange) => {
        const assets = await getExchangeAsset({
          exchangeName: exchange.exchange_name,
          exchangeType: exchange.exchange_type,
          apiKey: exchange.api_key,
          secretKey: exchange.secret_key,
        });

        return {
          exchange,
          assets: assets.map((asset) => ({
            coin_name: asset.coin_name,
            quantity: parseFloat(asset.quantity),
            usdt_price:
              typeof asset.usdt_price === "string"
                ? parseFloat(asset.usdt_price)
                : asset.usdt_price,
          })),
        };
      })
    );

    console.log(exchangeAssets);

    res.status(200).json(exchangeAssets);
  } catch (error) {
    console.error("Error connecting to PostgreSQL:", error);
    res.status(500).json({ error: "Failed to fetch exchanges and assets" });
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

    const transformedResult = [];

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
        transformedResult.push({ coin_name, quantity, usdt_price });
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
        transformedResult.push({ coin_name, quantity, usdt_price });
      }
    }
    // console.log(transformedResult);
    return transformedResult;
  } catch (err) {
    console.error("getBalance error: ", err);
  }
};

exports.getExchanges = async (req, res) => {
  db.any("SELECT * FROM exchanges ORDER BY id ASC")
    .then((resp) => {
      res.status(200).json(resp);
    })
    .catch((error) => {
      res.status(500).json("Error connecting to PostgreSQL:", error);
    });
};

// exports.deleteExchange = async (req, res) => {
//   const id = parseInt(req.params.id);

//   try {
//     await db.none("DELETE FROM exchanges WHERE id = $1", [id]);
//     res.status(200).send(`User deleted with ID: ${id}`);
//   } catch (error) {
//     res
//       .status(500)
//       .send({ message: "An error occurred while deleting user", error });
//   }
// };

exports.deleteExchange = async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    await db.tx(async (transaction) => {
      // Delete entries from other tables with foreign key constraint
      await transaction.none(
        "DELETE FROM assets WHERE portfolio_id IN (SELECT id FROM portfolios WHERE exchange_id = $1)",
        [id]
      );
      await transaction.none(
        "DELETE FROM balance_history WHERE portfolio_id IN (SELECT id FROM portfolios WHERE exchange_id = $1)",
        [id]
      );
      await transaction.none("DELETE FROM portfolios WHERE exchange_id = $1", [
        id,
      ]);

      // Delete the exchange itself
      await transaction.none("DELETE FROM exchanges WHERE id = $1", [id]);
    });

    res.status(200).send(`Exchange and related entries deleted with ID: ${id}`);
  } catch (error) {
    console.error(
      "An error occurred while deleting the exchange and related entries:",
      error
    );
    res.status(500).send({
      message: "Failed to delete the exchange and related entries",
      error,
    });
  }
};
