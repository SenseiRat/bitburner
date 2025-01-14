/**
 * Script: purchaseServers.js
 * Description: Purchases and upgrades servers and updates activeServers.txt.
 * Ensures activeServers.txt is maintained with server statuses.
 * @param {NS} ns
 */
export async function main(ns) {
    const activeServersFile = "/data/activeServers.txt";

    // Read or create activeServers.txt
    let activeServers = [];
    if (ns.fileExists(activeServersFile)) {
        const fileContent = ns.read(activeServersFile).trim();
        activeServers = fileContent ? JSON.parse(fileContent) : [];
    }

    const maxServers = ns.getPurchasedServerLimit();
    const baseRam = 8; // Starting RAM for new servers

    for (let i = 0; i < maxServers; i++) {
        const serverName = `pserv-${i}`;

        // Check if the server exists and can be upgraded
        if (ns.serverExists(serverName)) {
            const currentRam = ns.getServerMaxRam(serverName);
            const upgradeRam = currentRam * 2;

            if (upgradeRam <= ns.getPurchasedServerMaxRam() && ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(upgradeRam)) {
                ns.print(`[INFO] Upgrading ${serverName} to ${upgradeRam}GB.`);
                ns.killall(serverName);
                ns.deleteServer(serverName);
                await purchaseAndDeploy(ns, serverName, upgradeRam, activeServersFile);
                await ns.sleep(100);
            }
        } else {
            // Buy a new server if not already purchased
            if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(baseRam)) {
                await purchaseAndDeploy(ns, serverName, baseRam, activeServersFile);
            }
        }

        await ns.sleep(1000);
    }
}

/**
 * Purchases a server and updates activeServers.txt.
 * @param {NS} ns
 * @param {string} serverName
 * @param {number} ram
 * @param {string} activeServersFile
 */
async function purchaseAndDeploy(ns, serverName, ram, activeServersFile) {
    const hostname = ns.purchaseServer(serverName, ram);
    const scriptsToCopy = [
        "batch/grow.js",
        "batch/hack.js",
        "batch/weaken.js",
        "control.js"
    ];

    await ns.scp(scriptsToCopy, "home", hostname);
    ns.print(`[INFO] Deployed scripts to ${hostname}`);

    // Update activeServers.txt
    let activeServers = [];
    if (ns.fileExists(activeServersFile)) {
        activeServers = JSON.parse(ns.read(activeServersFile).trim() || "[]");
    }

    if (!activeServers.some(s => s.server === serverName)) {
        activeServers.push({ server: serverName, status: "ON", hasContract: false });
        await ns.write(activeServersFile, JSON.stringify(activeServers, null, 2), "w");
        ns.print(`[INFO] ${serverName} added to activeServers.txt and set to 'ON'.`);
    }

    const maxThreads = Math.floor(ram / ns.getScriptRam("batch/grow.js"));
    if (maxThreads > 0) {
        ns.exec("batch/grow.js", serverName, maxThreads, "joesguns");
        ns.print(`[INFO] Running grow.js on ${serverName} with ${maxThreads} threads.`);
    }
}
