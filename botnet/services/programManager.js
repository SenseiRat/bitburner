// File: botnet/services/programManager.js
// Description: Service to automatically purchase programs from "Create Program" when available and optimal.

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

    await sendToCommunications("INFO", "Program Manager service started.");

    const programList = [
        { name: "BruteSSH.exe", cost: 500e3 },
        { name: "FTPCrack.exe", cost: 1.5e6 },
        { name: "relaySMTP.exe", cost: 5e6 },
        { name: "HTTPWorm.exe", cost: 30e6 },
        { name: "SQLInject.exe", cost: 250e6 },
        { name: "DeepscanV1.exe", cost: 500e3 },
        { name: "DeepscanV2.exe", cost: 25e6 },
        { name: "AutoLink.exe", cost: 1e6 },
        { name: "ServerProfiler.exe", cost: 1e6 },
        { name: "Formulas.exe", cost: 5e9 }
    ];

    let programsPurchased = 0;
    const purchaseThreshold = parseFloat(config["programCost"] || "100"); // Default to 100% if not set

    while (true) {
        config = await readConfigFile(ns, CONFIG_PATH); // Re-read config for potential updates
        const playerMoney = ns.getServerMoneyAvailable("home");
        let nextProgram = null;

        for (const program of programList) {
            if (!ns.fileExists(program.name, "home")) {
                nextProgram = program;
                break;
            }
            programsPurchased++;
        }

        if (nextProgram) {
            const costThreshold = playerMoney * (purchaseThreshold / 100);
            if (nextProgram.cost <= costThreshold) {
                await sendToCommunications("SUCCESS", `Purchasing ${nextProgram.name} for $${nextProgram.cost.toLocaleString()}.`);
                ns.createProgram(nextProgram.name);
            } else {
                await sendToCommunications("INFO", `Next program is ${nextProgram.name}, costs $${nextProgram.cost.toLocaleString()}, available funds: $${playerMoney.toLocaleString()}. Waiting until funds exceed ${purchaseThreshold}% threshold.`);
            }
        } else {
            await sendToCommunications("SUCCESS", "All programs have been purchased.");
            await updateConfigValue(ns, CONFIG_PATH, "programManager", "OFF");
            await sendToCommunications("INFO", "Program Manager toggled OFF in config.txt.");
            break;
        }

        const percentageComplete = (programsPurchased / programList.length) * 100;
        await sendToCommunications("INFO", `Programs purchased: ${percentageComplete.toFixed(2)}% complete.`);

        await ns.sleep(10000); // Sleep for 10 seconds before checking again.
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\nprogramManager=ON\nprogramCost=100\n\n# System Run Variables\nportAssignments={}`;
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
