// File: botnet/services/serverManager.js
// Description: Service to manage purchasing and upgrading of servers up to the maximum available or a set cost threshold.

/** @param {NS} ns **/
export async function main(ns) {
    const CONFIG_PATH = "/data/config.txt";
    const ACTIVE_SERVERS_PATH = "/data/activeServers.txt";

    // Read configuration
    let config = await readConfigFile(ns, CONFIG_PATH);
    const portAssignments = JSON.parse(config["portAssignments"] || "{}");
    const commPort = portAssignments.communication ? portAssignments.communication[0] : 1;

    async function sendToCommunications(level, message) {
        const formattedMessage = `[${level}] ${message}`;
        await ns.writePort(commPort, formattedMessage);
    }

    async function getActiveServers() {
        if (!ns.fileExists(ACTIVE_SERVERS_PATH)) {
            await ns.write(ACTIVE_SERVERS_PATH, "{}", "w");
        }
        const content = await ns.read(ACTIVE_SERVERS_PATH);
        return JSON.parse(content || "{}");
    }

    async function addServerToActiveList(serverName) {
        const activeServers = await getActiveServers();
        activeServers[serverName] = { purchased: true };
        await ns.write(ACTIVE_SERVERS_PATH, JSON.stringify(activeServers, null, 2), "w");
    }

    await sendToCommunications("INFO", "Server Manager service started.");

    const maxServers = ns.getPurchasedServerLimit();
    const purchaseThreshold = parseFloat(config["serverCost"] || "10"); // Default to 10% of total wealth if not set

    while (true) {
        config = await readConfigFile(ns, CONFIG_PATH); // Re-read config for updates
        const playerMoney = ns.getServerMoneyAvailable("home");
        const serverCostThreshold = playerMoney * (purchaseThreshold / 100);
        let purchasedServers = ns.getPurchasedServers();

        // Purchase new servers if below max
        if (purchasedServers.length < maxServers) {
            const serverCost = ns.getPurchasedServerCost(8); // Start with 8GB servers for affordability
            if (serverCost <= serverCostThreshold) {
                const newServerName = `pserv-${purchasedServers.length}`;
                const hostname = ns.purchaseServer(newServerName, 8);
                if (hostname) {
                    await sendToCommunications("SUCCESS", `Purchased new server: ${hostname} for $${serverCost.toLocaleString()}.`);
                    await ns.scp("/botnet/scripts/worker.js", "home", hostname);
                    await addServerToActiveList(hostname);
                }
            } else {
                await sendToCommunications("INFO", `Next server costs $${serverCost.toLocaleString()}, available funds: $${playerMoney.toLocaleString()}.`);
            }
        }

        // Upgrade existing servers
        for (const server of purchasedServers) {
            const currentRam = ns.getServerMaxRam(server);
            const nextRam = currentRam * 2;
            if (nextRam <= ns.getPurchasedServerMaxRam()) {
                const upgradeCost = ns.getPurchasedServerCost(nextRam);
                if (upgradeCost <= serverCostThreshold) {
                    ns.deleteServer(server);
                    const upgradedServer = ns.purchaseServer(server, nextRam);
                    if (upgradedServer) {
                        await sendToCommunications("SUCCESS", `Upgraded server ${server} to ${nextRam}GB for $${upgradeCost.toLocaleString()}.`);
                        await ns.scp("/botnet/scripts/worker.js", "home", upgradedServer);
                        await addServerToActiveList(upgradedServer);
                    }
                } else {
                    await sendToCommunications("INFO", `Upgrade for ${server} to ${nextRam}GB costs $${upgradeCost.toLocaleString()}, available funds: $${playerMoney.toLocaleString()}.`);
                }
            }
        }

        await sendToCommunications("INFO", `Server count: ${purchasedServers.length}/${maxServers}. Waiting before the next check.`);
        await ns.sleep(60000); // Sleep for 1 minute before checking again.
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\nserverManager=ON\nserverCost=10\n\n# System Run Variables\nportAssignments={}`;
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
