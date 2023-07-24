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
  "ZEC", // Zcash,
  "XYM",
  "DCR",
  "IQ",
  "CTSI",
  "AERGO",
  "ARK",
  "TROY",
  "LIT",
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

    let result = [];

    for (const exchange of exchanges) {
      const [portfolio] = await db.any(
        "SELECT * FROM portfolios WHERE exchange_id = $1",
        [exchange.id]
      );
      console.log(portfolio);

      const assets = await db.any(
        "SELECT * FROM assets WHERE portfolio_id = $1",
        [portfolio.id]
      );

      result.push({
        exchange,
        portfolio,
        assets,
      });
    }

    res.status(200).json(result);
    // return result;

    // const exchanges = await db.any(
    //   "SELECT * FROM exchanges WHERE user_id = $1",
    //   [userId]
    // );

    // const exchangeAssets = await Promise.all(
    //   exchanges.map(async (exchange) => {
    //     const assets = await getExchangeAsset({
    //       exchangeName: exchange.exchange_name,
    //       exchangeType: exchange.exchange_type,
    //       apiKey: exchange.api_key,
    //       secretKey: exchange.secret_key,
    //     });

    //     // const portfolios = await db.any(
    //     //   "SELECT * FROM portfolios WHERE exchange_id = $1",
    //     //   [exchange.id]
    //     // );

    //     const totalUsdtPrice = assets.reduce((sum, item) => {
    //       console.log(item.coin, item.usdt_price);
    //       let usdtPrice =
    //         typeof item.usdt_price === "string"
    //           ? parseFloat(item.usdt_price)
    //           : item.usdt_price;

    //       // If usdtPrice is NaN or undefined, consider it as 0
    //       if (isNaN(usdtPrice) || usdtPrice === undefined) {
    //         usdtPrice = 0;
    //       }

    //       return sum + usdtPrice;
    //     }, 0);

    //     // const totalUsdtPrice = assets.reduce((sum, item) => {
    //     //   console.log(item.coin, item.usdt_price);
    //     //   const usdtPrice =
    //     //     typeof item.usdt_price === "string"
    //     //       ? parseFloat(item.usdt_price)
    //     //       : item.usdt_price;
    //     //   return sum + usdtPrice;
    //     // }, 0);

    //     console.log("totalUsdtPrice", totalUsdtPrice);

    //     const portfolios = await db.one(
    //       `UPDATE portfolios
    //       SET balance = $1, locked_balance = $2
    //       WHERE exchange_id = $3
    //       RETURNING *`,
    //       [totalUsdtPrice, totalUsdtPrice, exchange.id]
    //     );

    //     return {
    //       exchange,
    //       assets: assets,
    //       portfolios,
    //     };
    //   })
    // );

    // res.status(200).json(exchangeAssets);
  } catch (error) {
    res.status(500).json({ error: "Error connecting to PostgreSQL:", error });
  }
};

exports.getAssetsSymbolByUserId = async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const exchanges = await db.any(
      "SELECT * FROM exchanges WHERE user_id = $1",
      [userId]
    );
    const exchangeAssets = await Promise.all(
      exchanges.map(async (exchange) => {
        const assetsSymbols = await getExchangeAssetSymbol({
          exchangeName: exchange.exchange_name,
          exchangeType: exchange.exchange_type,
          apiKey: exchange.api_key,
          secretKey: exchange.secret_key,
        });

        console.log("symbols", assetsSymbols);

        // const portfolios = await db.one(
        //   `UPDATE portfolios
        //   SET balance = $1, locked_balance = $2
        //   WHERE exchange_id = $3
        //   RETURNING *`,
        //   [totalUsdtPrice, totalUsdtPrice, exchange.id]
        // );

        return {
          exchange,
          assetsSymbols,
        };
      })
    );

    res.status(200).json(exchangeAssets);
  } catch (error) {}
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
    client = new MainClient({
      api_key: exchange?.apiKey,
      api_secret: exchange?.secretKey,
      recvWindow: 10000,
    });
  }

  const binance = new ccxt.binance();

  try {
    let result;
    if (exchange?.exchangeType === "Binance Spot") {
      console.log("Binance Spot Block");
      let data = await client.getBalances();
      // console.log("Result from server: ", data);
      result = data.filter((item) => parseFloat(item.free) > 0);

      // result = data.filter((item) => cryptoSymbols.includes(item.coin));

      console.log("getBalance result: ", result);
    } else {
      result = await client.getBalance();
      console.log("getBalance result: ", result);
    }
    // const result = await client.getBalance();
    // console.log("getBalance result: ", result);

    //   const transformedResult = [];

    if (exchange?.exchangeType === "Binance Spot") {
      console.log("spot is", result);
      // const newResult = result.filter(exchange=> exchange.free !== "0")
      for (const asset of result) {
        if (asset.coin === "USDT") {
          asset["usdt_price"] = +asset.free;
          asset["availableBalance"] = asset.free;
          asset["balance"] = asset.free;
          asset["asset"] = asset.coin;
        } else {
          // const symbol = asset.coin;
          const symbol = `${asset.coin}/USDT`;
          console.log(symbol);
          try {
            const ticker = await binance.fetchTicker(symbol);
            // Add the check here
            if (ticker === undefined) {
              console.log(`Ticker for ${symbol} is undefined.`);
              continue; // Skip to the next iteration
            }
            const usdtPrice = ticker.last;
            if (usdtPrice !== undefined && !isNaN(usdtPrice)) {
              const usdtBalance = parseFloat(asset.free) * usdtPrice;
              asset["usdt_price"] = usdtBalance;
              asset["availableBalance"] = asset.free;
              asset["balance"] = asset.free;
              asset["asset"] = asset.coin;
            }
            // let markets = await binance.loadMarkets();
            // if (symbol in markets) {
            //   // symbol is supported
            //   try {
            //     const ticker = await binance.fetchTicker(symbol);
            //     const usdtPrice = ticker.last;
            //     const usdtBalance = parseFloat(asset.free) * usdtPrice;
            //     asset["usdt_price"] = usdtBalance;
            //     asset["availableBalance"] = asset.free;
            //     asset["balance"] = asset.free;
            //     asset["asset"] = asset.coin;
            //     //...
            //   } catch (error) {
            //     if (error instanceof ccxt.BadSymbol) {
            //       console.log(`Symbol ${symbol} not supported`);
            //       // handle error appropriately
            //     } else {
            //       // rethrow the error if it's not a BadSymbol error
            //       throw error;
            //     }
            //   }
            // }
          } catch (err) {
            console.log(err);
            const symbol = `${asset.coin}/BUSD`;
            console.log(symbol);
            try {
              const ticker = await binance.fetchTicker(symbol);

              // Add the check here too
              if (ticker === undefined) {
                console.log(`Ticker for ${symbol} is undefined.`);
                continue; // Skip to the next iteration
              }

              const usdtPrice = ticker.last;
              if (usdtPrice !== undefined && !isNaN(usdtPrice)) {
                const usdtBalance = parseFloat(asset.free) * usdtPrice;
                asset["usdt_price"] = usdtBalance;
                asset["asset"] = asset.coin;
                asset["balance"] = asset.free;
              }
            } catch (error) {
              console.log(error);
            }
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

const getExchangeAssetSymbol = async (exchange) => {
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
    client = new MainClient({
      api_key: exchange?.apiKey,
      api_secret: exchange?.secretKey,
      recvWindow: 10000,
    });
  }

  try {
    let result;
    let newResult;
    if (exchange?.exchangeType === "Binance Spot") {
      console.log("Binance Spot Block");
      let data = await client.getBalances();
      result = data.filter((item) => parseFloat(item.free) > 0);
      newResult = result.map((item) => `${item.coin}/USDT`);

      console.log("getBalance result: ", result);
    } else {
      result = await client.getBalance();
      newResult = result.map((item) => `${item.asset}/USDT`);
      console.log("getBalance result: ", result);
    }
    console.log(result);
    return newResult;
  } catch (err) {
    console.error("getBalance error: ", err);
  }
};
