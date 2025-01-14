// File: botnet/services/upgradeManager.js
// Description: Service to automatically purchase computer upgrades when available and optimal.

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

    await sendToCommunications("INFO", "Upgrade Manager service started.");

    const upgradeOptions = [
        { name: "Home RAM Upgrade", getCost: () => ns.getUpgradeHomeRamCost() },
        { name: "Home CPU Core Upgrade", getCost: () => ns.getUpgradeHomeCoresCost() }
    ];

    const purchaseThreshold = parseFloat(config["computerCost"] || "1"); // Default to 1% if not set

    while (true) {
        config = await readConfigFile(ns, CONFIG_PATH); // Re-read config for potential updates
        const playerMoney = ns.getServerMoneyAvailable("home");

        let allUpgradesComplete = true;

        for (const upgrade of upgradeOptions) {
            const upgradeCost = upgrade.getCost();

            if (upgradeCost > 0 && upgradeCost <= playerMoney * (purchaseThreshold / 100)) {
                await sendToCommunications("SUCCESS", `Purchasing ${upgrade.name} for $${upgradeCost.toLocaleString()}.`);
                if (upgrade.name === "Home RAM Upgrade") {
                    ns.upgradeHomeRam();
                } else if (upgrade.name === "Home CPU Core Upgrade") {
                    ns.upgradeHomeCores();
                }
                allUpgradesComplete = false; // An upgrade was made, so not all upgrades are complete
                break;
            } else if (upgradeCost > 0) {
                allUpgradesComplete = false; // Upgrade is available but too expensive, so wait
                await sendToCommunications("INFO", `Next upgrade is ${upgrade.name}, costs $${upgradeCost.toLocaleString()}, available funds: $${playerMoney.toLocaleString()}. Waiting until funds exceed ${purchaseThreshold}% threshold.`);
            }
        }

        if (allUpgradesComplete) {
            await sendToCommunications("SUCCESS", "All computer upgrades have been purchased.");
            await updateConfigValue(ns, CONFIG_PATH, "upgradeManager", "OFF");
            await sendToCommunications("INFO", "Upgrade Manager toggled OFF in config.txt.");
            break;
        }

        await sendToCommunications("INFO", "No available upgrades within the threshold.");
        await ns.sleep(60000); // Sleep for 1 minute before checking again.
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\nupgradeManager=ON\ncomputerCost=1\n\n# System Run Variables\nportAssignments={}`;
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
