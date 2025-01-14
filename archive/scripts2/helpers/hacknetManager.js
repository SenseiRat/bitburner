/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    ns.tprint("[INFO] Starting Hacknet node management...");

    const maxNodes = ns.hacknet.maxNumNodes();
    let purchasedNodes = ns.hacknet.numNodes();

    // Configuration for upgrade limits
    const maxLevel = 200;
    const maxRam = 64; // Maximum Hacknet node RAM (GB)
    const maxCores = 16;

    while (true) {
        // Purchase new Hacknet nodes if under the max allowed
        if (purchasedNodes < maxNodes && ns.getServerMoneyAvailable("home") > ns.hacknet.getPurchaseNodeCost()) {
            const newNode = ns.hacknet.purchaseNode();
            if (newNode !== -1) {
                ns.tprint(`[INFO] Purchased new Hacknet Node: Node-${newNode}.`);
                purchasedNodes++;
            } else {
                ns.print("[WARN] Failed to purchase new Hacknet node.");
            }
        }

        // Upgrade existing Hacknet nodes
        for (let i = 0; i < purchasedNodes; i++) {
            const currentLevel = ns.hacknet.getNodeStats(i).level;
            const currentRam = ns.hacknet.getNodeStats(i).ram;
            const currentCores = ns.hacknet.getNodeStats(i).cores;

            if (currentLevel < maxLevel && ns.getServerMoneyAvailable("home") > ns.hacknet.getLevelUpgradeCost(i, 1)) {
                ns.hacknet.upgradeLevel(i, 1);
                ns.print(`[INFO] Upgraded Node-${i} to level ${currentLevel + 1}.`);
            }

            if (currentRam < maxRam && ns.getServerMoneyAvailable("home") > ns.hacknet.getRamUpgradeCost(i, 1)) {
                ns.hacknet.upgradeRam(i, 1);
                ns.print(`[INFO] Upgraded Node-${i} RAM to ${currentRam * 2} GB.`);
            }

            if (currentCores < maxCores && ns.getServerMoneyAvailable("home") > ns.hacknet.getCoreUpgradeCost(i, 1)) {
                ns.hacknet.upgradeCore(i, 1);
                ns.print(`[INFO] Upgraded Node-${i} cores to ${currentCores + 1}.`);
            }
        }

        // Log summary of current Hacknet state
        const totalProduction = ns.hacknet.moneyGainRatePerSecond();
        ns.print(`[INFO] Total Hacknet money gain rate: $${totalProduction.toFixed(2)}/s.`);

        await ns.sleep(10000); // Check every 10 seconds for upgrades or purchases
    }
}
