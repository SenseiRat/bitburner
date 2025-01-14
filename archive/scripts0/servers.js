/** @param {NS} ns */
export async function main(ns) {
    const hackLevel = ns.getHackingLevel();
    let targetServer = "";
    let maxMoney = 0; // Track the highest money for selection

    for (const server of servers) {
      // Ensure the server's skill requirement is within 1/3 of the hackLevel and it has money
      if (server.skill <= hackLevel / 3) {
        const serverMaxMoney = ns.getServerMaxMoney(server.name);

        if (serverMaxMoney > maxMoney) {
            maxMoney = serverMaxMoney;
            targetServer = server.name; // Set the server with the highest max money
        }
      }
    }

    if (!targetServer) {
        ns.tprint("No valid target server found! Defaulting to 'joesguns'");
        targetServer = "joesguns"; // Fallback if no optimal server is found
    }

    ns.tprint(`Target Server set to: ${targetServer}`);

    // Maximum server count and RAM increment
    const maxServers = ns.getPurchasedServerLimit();
    const baseRam = 8; // Starting RAM for new servers

    for (let i = 0; i < maxServers; i++) {
        const serverName = `pserv-${i}`;

        // Check if the server exists and can be upgraded
        if (ns.serverExists(serverName)) {
            ns.tprint(`Working server: ${serverName}`)
            const currentRam = ns.getServerMaxRam(serverName);
            const upgradeRam = currentRam * 2;
            ns.tprint(`Upgrade RAM: ${upgradeRam}`);

            // Only delete and upgrade if you can afford a meaningful upgrade
            if (upgradeRam <= ns.getPurchasedServerMaxRam() && ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(upgradeRam)) {
                ns.print(`Upgrading ${serverName} to ${upgradeRam}GB`);
                ns.killall(serverName);
                ns.deleteServer(serverName);
                await purchaseAndDeploy(ns, serverName, upgradeRam, targetServer);
                await ns.sleep(100);
            }
        } else {
            // Buy a new server if not already purchased
            if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(baseRam)) {
                await purchaseAndDeploy(ns, serverName, baseRam, targetServer);
            }
        }

        await ns.sleep(1000);
    }
}

/**
 * Purchases a server and deploys the hacking script
 * @param {NS} ns
 * @param {string} serverName
 * @param {number} ram
 * @param {string} target
 */
async function purchaseAndDeploy(ns, serverName, ram, target) {
    const hostname = ns.purchaseServer(serverName, ram);
    await ns.scp("money.js", serverName);
    const maxThreads = Math.floor(ram / ns.getScriptRam("money.js")); // Calculate threads
    if (maxThreads > 0) {
        ns.exec("money.js", serverName, maxThreads, target); // Run script
        ns.print(`Deployed money.js on ${serverName} with ${maxThreads} threads targeting ${target}`);
    }
}
