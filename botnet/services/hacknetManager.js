// File: botnet/services/hacknetManager.js
// Description: Service to manage hacknet node purchases and upgrades based on thresholds.

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

    await sendToCommunications("INFO", "Hacknet Manager service started.");

    const purchaseThresholds = {
        node: parseFloat(config["hacknetNodes"] || "10"),
        level: parseFloat(config["hacknetLevels"] || "10"),
        ram: parseFloat(config["hacknetRam"] || "10"),
        cores: parseFloat(config["hacknetCores"] || "10")
    };

    while (true) {
        const playerMoney = ns.getServerMoneyAvailable("home");
        let purchasedSomething = false;

        // Purchase new hacknet node if below threshold
        if (ns.hacknet.numNodes() < ns.hacknet.maxNumNodes()) {
            const nodeCost = ns.hacknet.getPurchaseNodeCost();
            if (nodeCost <= playerMoney * (purchaseThresholds.node / 100)) {
                const nodeIndex = ns.hacknet.purchaseNode();
                if (nodeIndex !== -1) {
                    await sendToCommunications("SUCCESS", `Purchased new hacknet node ${nodeIndex} for $${nodeCost.toLocaleString()}.`);
                    purchasedSomething = true;
                }
            }
        }

        // Upgrade existing hacknet nodes
        for (let i = 0; i < ns.hacknet.numNodes(); i++) {
            const levelCost = ns.hacknet.getLevelUpgradeCost(i, 1);
            const ramCost = ns.hacknet.getRamUpgradeCost(i, 1);
            const coreCost = ns.hacknet.getCoreUpgradeCost(i, 1);

            if (levelCost <= playerMoney * (purchaseThresholds.level / 100) && ns.hacknet.getNodeStats(i).level < ns.hacknet.maxLevel()) {
                if (ns.hacknet.upgradeLevel(i, 1)) {
                    await sendToCommunications("SUCCESS", `Upgraded hacknet node ${i} level for $${levelCost.toLocaleString()}.`);
                    purchasedSomething = true;
                }
            }
            if (ramCost <= playerMoney * (purchaseThresholds.ram / 100) && ns.hacknet.getNodeStats(i).ram < ns.hacknet.maxRam()) {
                if (ns.hacknet.upgradeRam(i, 1)) {
                    await sendToCommunications("SUCCESS", `Upgraded hacknet node ${i} RAM for $${ramCost.toLocaleString()}.`);
                    purchasedSomething = true;
                }
            }
            if (coreCost <= playerMoney * (purchaseThresholds.cores / 100) && ns.hacknet.getNodeStats(i).cores < ns.hacknet.maxCores()) {
                if (ns.hacknet.upgradeCore(i, 1)) {
                    await sendToCommunications("SUCCESS", `Upgraded hacknet node ${i} cores for $${coreCost.toLocaleString()}.`);
                    purchasedSomething = true;
                }
            }
        }

        // If no upgrades or purchases are left
        if (!purchasedSomething && ns.hacknet.numNodes() === ns.hacknet.maxNumNodes()) {
            let allMaxedOut = true;
            for (let i = 0; i < ns.hacknet.numNodes(); i++) {
                const stats = ns.hacknet.getNodeStats(i);
                if (stats.level < ns.hacknet.maxLevel() || stats.ram < ns.hacknet.maxRam() || stats.cores < ns.hacknet.maxCores()) {
                    allMaxedOut = false;
                    break;
                }
            }

            if (allMaxedOut) {
                await sendToCommunications("INFO", "All hacknet nodes fully upgraded.");
                await updateConfigValue(ns, CONFIG_PATH, "hacknetManager", "OFF");
                await sendToCommunications("INFO", "Hacknet Manager toggled OFF in config.txt.");
                break;
            }
        }

        await ns.sleep(5000); // Wait before the next check
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\nhacknetManager=ON\n\n# System Run Variables\nportAssignments={}`;
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

async function updateConfigValue(ns, path, key, value) {
    const content = await ns.read(path);
    const lines = content.split("\n");
    let updated = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(`${key}=`)) {
            lines[i] = `${key}=${value}`;
            updated = true;
            break;
        }
    }
    if (!updated) {
        lines.push(`${key}=${value}`);
    }
    await ns.write(path, lines.join("\n"), "w");
}
