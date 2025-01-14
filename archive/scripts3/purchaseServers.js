// /scripts3/purchaseServers.js
// Description: Purchases or upgrades servers based on the player's available wealth and configured spending threshold.
// Parameters: --threshold [number] - The percentage (0-100) of player's money to use for server purchases/upgrades.

/** GLOBAL VARIABLES */
const ACTIVE_SERVERS_FILE = "/data/activeServers.txt";
const MIN_SERVER_RAM = 8; // Minimum 8 GB per server.
const MAX_SERVERS = 25; // Max number of servers.
const SERVER_PREFIX = "pserv-";

/**
 * Parses script arguments to get the threshold percentage.
 * @param {NS} ns - Bitburner namespace.
 * @returns {number} Threshold percentage (default: 10%).
 */
function getThreshold(ns) {
    const args = ns.args;
    const thresholdIndex = args.indexOf("--threshold");
    if (thresholdIndex !== -1 && args.length > thresholdIndex + 1) {
        const threshold = parseFloat(args[thresholdIndex + 1]);
        if (!isNaN(threshold) && threshold >= 0 && threshold <= 100) {
            return threshold / 100; // Convert to decimal.
        }
    }
    ns.print("[WARN] No valid threshold provided. Defaulting to 10%.");
    return 0.1; // Default to 10%.
}

/**
 * Reads or initializes the active servers file.
 */
async function readActiveServers(ns) {
    if (!await ns.fileExists(ACTIVE_SERVERS_FILE)) {
        ns.print(`[INFO] ${ACTIVE_SERVERS_FILE} not found. Creating an empty file.`);
        await ns.write(ACTIVE_SERVERS_FILE, "", "w");
    }
    const data = await ns.read(ACTIVE_SERVERS_FILE).trim();
    return data ? data.split("\n") : [];
}

/**
 * Adds or removes a server from the activeServers.txt list.
 * Ensures no duplicates and handles removal gracefully.
 * @param {NS} ns - Bitburner namespace.
 * @param {string} serverName - The name of the server to add or remove.
 * @param {string} action - "add" to add the server, "remove" to remove it.
 */
async function toggleServerInActiveList(ns, serverName, action) {
    const activeServers = await readActiveServers(ns);

    if (action === "add" && !activeServers.includes(serverName)) {
        ns.print(`[INFO] Adding ${serverName} to active servers.`);
        activeServers.push(serverName);
        await ns.write(ACTIVE_SERVERS_FILE, [...new Set(activeServers)].join("\n"), "w");
    } else if (action === "remove" && activeServers.includes(serverName)) {
        ns.print(`[INFO] Removing ${serverName} from active servers.`);
        const updatedServers = activeServers.filter(server => server !== serverName);
        await ns.write(ACTIVE_SERVERS_FILE, updatedServers.join("\n"), "w");
    } else {
        ns.print(`[INFO] No changes made for ${serverName} with action: ${action}`);
    }
}

/**
 * Identifies the server with the smallest RAM for upgrade.
 */
function getSmallestServer(ns) {
    const servers = ns.getPurchasedServers();
    if (servers.length === 0) return null;
    return servers.reduce((smallest, current) => {
        return ns.getServerMaxRam(current) < ns.getServerMaxRam(smallest) ? current : smallest;
    });
}

/**
 * Calculates the largest server size affordable based on the given threshold.
 */
function getLargestAffordableServer(ns, maxSpend) {
    let ram = MIN_SERVER_RAM;
    while (ns.getPurchasedServerCost(ram * 2) <= maxSpend) {
        ram *= 2;
    }
    return ram;
}

/**
 * Main function: Purchases or upgrades servers.
 * @param {NS} ns - Bitburner namespace.
 */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("[INFO] Starting purchaseServers.js...");

    const threshold = getThreshold(ns); // Get the spending threshold.

    const playerMoney = ns.getPlayer().money;
    const maxSpend = playerMoney * threshold; // Maximum money to spend.
    const purchasedServers = ns.getPurchasedServers();

    if (purchasedServers.length < MAX_SERVERS) {
        // Buy a new server.
        const ram = getLargestAffordableServer(ns, maxSpend);
        if (ram >= MIN_SERVER_RAM) {
            const hostname = ns.purchaseServer(`${SERVER_PREFIX}${purchasedServers.length}`, ram);
            if (hostname) {
                ns.print(`[SUCCESS] Purchased new server: ${hostname} with ${ram} GB RAM.`);
                if (!ns.fileExists("/scripts3/worker.js", hostname)) {
                    await ns.scp("/scripts3/worker.js", "home", hostname);
                }
                await toggleServerInActiveList(ns, hostname, "add");
            }
        } else {
            ns.print("[INFO] Not enough money to buy at least an 8GB server.");
        }
    } else {
        // Upgrade existing server.
        const smallestServer = getSmallestServer(ns);
        if (smallestServer) {
            const currentRam = ns.getServerMaxRam(smallestServer);
            const nextUpgradeRam = currentRam * 2;
            const upgradeCost = ns.getPurchasedServerCost(nextUpgradeRam);

            if (nextUpgradeRam >= MIN_SERVER_RAM && upgradeCost <= maxSpend) {
                ns.print(`[INFO] Upgrading ${smallestServer} from ${currentRam} GB to ${nextUpgradeRam} GB.`);
                ns.killall(smallestServer);
                ns.deleteServer(smallestServer);
                const hostname = ns.purchaseServer(smallestServer, nextUpgradeRam);
                if (hostname) {
                    ns.print(`[SUCCESS] Upgraded server: ${hostname} to ${nextUpgradeRam} GB RAM.`);
                    if (!ns.fileExists("/scripts3/worker.js", hostname)) {
                        await ns.scp("/scripts3/worker.js", hostname, "home");
                    }
                    await toggleServerInActiveList(ns, hostname, "add");
                }
            } else {
                ns.print("[INFO] Not enough money to upgrade to a higher RAM server.");
            }
        }
    }

    ns.print("[INFO] purchaseServers.js completed and will terminate.");
    ns.exit(); // Ensure the script terminates after completing its operations.
}
