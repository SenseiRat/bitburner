// File: botnet/services/factionManager.js
// Description: Service to monitor faction reputation gain per second and suggest optimal activities.

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

    await sendToCommunications("INFO", "Faction Manager service started.");

    let previousRepData = getFactionReputationData(ns);
    let lastTimestamp = new Date().getTime();
    let reportIntervalTimestamp = lastTimestamp;
    const reportIntervalMinutes = 5; // Regular report interval in minutes

    while (true) {
        await ns.sleep(10000); // Check every 10 seconds

        const currentRepData = getFactionReputationData(ns);
        const currentTime = new Date().getTime();
        const timeElapsedSeconds = (currentTime - lastTimestamp) / 1000;
        const timeSinceLastReportSeconds = (currentTime - reportIntervalTimestamp) / 1000;

        let totalRepGain = 0;
        let bestFaction = { name: "None", gainPerSecond: 0 };

        for (const [faction, rep] of Object.entries(currentRepData)) {
            const previousRep = previousRepData[faction] || 0;
            const repGain = rep - previousRep;
            const repPerSecond = repGain / timeElapsedSeconds;

            if (repPerSecond > bestFaction.gainPerSecond) {
                bestFaction = { name: faction, gainPerSecond: repPerSecond };
            }

            totalRepGain += repGain;
        }

        await sendToCommunications("INFO", `Total faction reputation gain rate: ${totalRepGain.toFixed(2)} rep per second.`);
        await sendToCommunications("INFO", `Highest reputation gain rate: ${bestFaction.name} at ${bestFaction.gainPerSecond.toFixed(2)} rep per second.`);

        // Suggest optimal activity if no gain detected
        if (bestFaction.gainPerSecond === 0) {
            await sendToCommunications("WARN", "No faction reputation gain detected. Consider focusing on working for factions or completing faction-related objectives.");
        }

        // Provide a regular report every specified interval
        if (timeSinceLastReportSeconds >= reportIntervalMinutes * 60) {
            let totalReputationGained = 0;
            for (const [faction, rep] of Object.entries(currentRepData)) {
                const previousRep = previousRepData[faction] || 0;
                totalReputationGained += rep - previousRep;
            }
            await sendToCommunications("INFO", `Faction report: ${totalReputationGained.toFixed(2)} total reputation gained over the last ${reportIntervalMinutes} minutes.`);
            reportIntervalTimestamp = currentTime;
        }

        // Update values for the next iteration
        previousRepData = currentRepData;
        lastTimestamp = currentTime;
    }
}

function getFactionReputationData(ns) {
    const factions = ns.getPlayer().factions;
    const repData = {};
    for (const faction of factions) {
        repData[faction] = ns.getFactionRep(faction);
    }
    return repData;
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\nfactionManager=ON\n\n# System Run Variables\nportAssignments={}`;
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
