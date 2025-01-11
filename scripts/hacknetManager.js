// /scripts3/hacknetManager.js
// Description: Automatically buys and upgrades Hacknet nodes until maxed out.
// Parameters: --threshold [number] - The percentage (0-100) of player's money to use for Hacknet upgrades.

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
 * Main function: Automatically buy and upgrade Hacknet nodes.
 * @param {NS} ns - Bitburner namespace.
 */
export async function main(ns) {
    //ns.tprint("[DEBUG] HACKNET MANAGER ***")
    ns.disableLog("ALL");
    ns.print("[INFO] Starting hacknetManager.js...");

    const threshold = getThreshold(ns); // Get the spending threshold.

    const playerMoney = ns.getPlayer().money;
    const maxSpend = playerMoney * threshold; // Maximum money to spend.
    let purchaseMade = false;

    // Attempt to buy a new Hacknet node.
    if (ns.hacknet.numNodes() < ns.hacknet.maxNumNodes()) {
        const nodeCost = ns.hacknet.getPurchaseNodeCost();
        if (nodeCost <= maxSpend) {
            const nodeIndex = ns.hacknet.purchaseNode();
            if (nodeIndex !== -1) {
                ns.print(`[SUCCESS] Purchased Hacknet Node ${nodeIndex} for $${nodeCost.toLocaleString()}.`);
                purchaseMade = true;
            }
        }
    }

    // Attempt to upgrade existing Hacknet nodes.
    for (let i = 0; i < ns.hacknet.numNodes(); i++) {
        const levelCost = ns.hacknet.getLevelUpgradeCost(i, 1);
        const ramCost = ns.hacknet.getRamUpgradeCost(i, 1);
        const coreCost = ns.hacknet.getCoreUpgradeCost(i, 1);

        if (levelCost <= maxSpend) {
            if (ns.hacknet.upgradeLevel(i, 1)) {
                ns.print(`[SUCCESS] Upgraded Node ${i}'s level for $${levelCost.toLocaleString()}.`);
                purchaseMade = true;
            }
        }

        if (ramCost <= maxSpend) {
            if (ns.hacknet.upgradeRam(i, 1)) {
                ns.print(`[SUCCESS] Upgraded Node ${i}'s RAM for $${ramCost.toLocaleString()}.`);
                purchaseMade = true;
            }
        }

        if (coreCost <= maxSpend) {
            if (ns.hacknet.upgradeCore(i, 1)) {
                ns.print(`[SUCCESS] Upgraded Node ${i}'s cores for $${coreCost.toLocaleString()}.`);
                purchaseMade = true;
            }
        }
    }

    // auto disable if we are done
    let allMaxed = true;

    for (let i = 0; i < numNodes; i++) {
        const nodeStats = ns.hacknet.getNodeStats(i);
        if (nodeStats.level < ns.hacknet.getLevelUpgradeCost(i, 1) ||
            nodeStats.ram < ns.hacknet.getRamUpgradeCost(i, 1) ||
            nodeStats.cores < ns.hacknet.getCoreUpgradeCost(i, 1)) {
            allMaxed = false;
            break;
        }
    }

    if (allMaxed) {
        await updateConfig(ns, "hacknetManager", "OFF");
        ns.print("[INFO] All hacknet nodes are maximized. Turning hacknetManager OFF.");
    } else {
        await updateConfig(ns, "hacknetManager", "ON");
        ns.print("[INFO] Hacknet nodes are not fully maximized. Keeping hacknetManager ON.");
    }
    // end auto disable code

    if (!purchaseMade) {
        ns.print("[INFO] No upgrades or purchases made. Hacknet Manager will now exit.");
    }

    ns.print("[INFO] hacknetManager.js has completed its run and will exit.");
    ns.exit(); // Ensure the script terminates after completing its operations.
}
