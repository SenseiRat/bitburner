// File: botnet/services/incomeIntel.js
// Description: Service to report total income per second from all sources.

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

    await sendToCommunications("INFO", "Income Intel service started.");

    let previousTotalMoney = ns.getServerMoneyAvailable("home");
    let lastTimestamp = new Date().getTime();

    while (true) {
        await ns.sleep(5000); // Check every 5 seconds

        const currentTotalMoney = ns.getServerMoneyAvailable("home");
        const currentTime = new Date().getTime();
        const timeElapsedSeconds = (currentTime - lastTimestamp) / 1000;

        const incomePerSecond = (currentTotalMoney - previousTotalMoney) / timeElapsedSeconds;

        await sendToCommunications("INFO", `Income rate: $${incomePerSecond.toLocaleString(undefined, { maximumFractionDigits: 2 })} per second.`);

        // Update values for the next iteration
        previousTotalMoney = currentTotalMoney;
        lastTimestamp = currentTime;
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\nincomeIntel=ON\n\n# System Run Variables\nportAssignments={}`;
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
