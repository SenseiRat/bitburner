// File: botnet/services/stockManager.js
// Description: Service to manage stock market trades and provide guidance based on available APIs and stock performance.

/** @param {NS} ns **/
export async function main(ns) {
    const CONFIG_PATH = "/data/config.txt";

    // Read configuration
    let config = await readConfigFile(ns, CONFIG_PATH);
    const portAssignments = JSON.parse(config["portAssignments"] || "{}");
    const commPort = portAssignments.communication ? portAssignments.communication[0] : 1;

    async function sendToCommunications(level, message) {
        const formattedMessage = `[${level}] ${message}`;
        await ns.writePort(commPort, formattedMessage);
    }

    await sendToCommunications("INFO", "Stock Manager service started.");

    // Check for stock market API access
    if (!ns.stock.has4SData() || !ns.stock.has4SDataTIXAPI()) {
        await sendToCommunications("WARN", "Stock market API access is not fully available. Consider purchasing TIX and 4S Market Data access.");
        return;
    } else {
        await sendToCommunications("INFO", "Stock market API access verified.");
    }

    while (true) {
        await ns.sleep(30000); // Check every 30 seconds

        const stocks = ns.stock.getSymbols().map(symbol => {
            const askPrice = ns.stock.getAskPrice(symbol);
            const bidPrice = ns.stock.getBidPrice(symbol);
            const forecast = ns.stock.getForecast(symbol);
            const volatility = ns.stock.getVolatility(symbol);
            const shares = ns.stock.getPosition(symbol)[0];

            return { symbol, askPrice, bidPrice, forecast, volatility, shares };
        });

        const optimalStocks = stocks.filter(stock => stock.forecast > 0.6 && stock.volatility < 0.1);
        if (optimalStocks.length > 0) {
            optimalStocks.sort((a, b) => b.forecast - a.forecast);
            const bestStock = optimalStocks[0];
            await sendToCommunications("INFO", `Best stock to consider: ${bestStock.symbol} with forecast ${bestStock.forecast.toFixed(2)} and low volatility (${bestStock.volatility.toFixed(2)}).`);

            if (ns.getServerMoneyAvailable("home") > bestStock.askPrice * 100) {
                const sharesToBuy = Math.floor(ns.getServerMoneyAvailable("home") / bestStock.askPrice);
                const result = ns.stock.buy(bestStock.symbol, sharesToBuy);
                if (result > 0) {
                    await sendToCommunications("SUCCESS", `Purchased ${sharesToBuy} shares of ${bestStock.symbol} at $${bestStock.askPrice.toLocaleString()}.`);
                } else {
                    await sendToCommunications("ERROR", `Failed to purchase shares of ${bestStock.symbol}.`);
                }
            }
        } else {
            await sendToCommunications("INFO", "No optimal stocks to purchase at this time.");
        }

        // Check existing holdings and decide whether to sell
        for (const stock of stocks) {
            if (stock.shares > 0 && stock.forecast < 0.5) {
                const result = ns.stock.sell(stock.symbol, stock.shares);
                if (result > 0) {
                    await sendToCommunications("SUCCESS", `Sold ${stock.shares} shares of ${stock.symbol} at $${stock.bidPrice.toLocaleString()}.`);
                } else {
                    await sendToCommunications("ERROR", `Failed to sell shares of ${stock.symbol}.`);
                }
            }
        }

        // Report summary of holdings
        const totalHoldings = stocks.reduce((sum, stock) => sum + (stock.bidPrice * stock.shares), 0);
        await sendToCommunications("INFO", `Total stock holdings value: $${totalHoldings.toLocaleString()}.`);
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\nstockManager=ON\n\n# System Run Variables\nportAssignments={}`;
        await ns.write(path, defaultConfig, "w");
    }
    const content = await ns.read(path);
    const configLines = content.split("\n").filter(line => line.trim() && !line.startsWith("#"));
    const config = {};
    for (const line of configLines) {
        const [key, value] = line.split("=").map(s => s.trim());
        config[key] = value;
    }
    return config;
}
