// File: botnet/services/memoryIntel.js
// Description: Service to monitor RAM allocation on home and warn if worker.js processes exceed buffer limits.

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

    await sendToCommunications("INFO", "Memory Intel service started.");

    const bufferRam = parseFloat(config["homeWorkerRam"] || "64"); // Buffer RAM from config, default to 64GB if not set

    while (true) {
        await ns.sleep(5000); // Check every 5 seconds

        const totalRam = ns.getServerMaxRam("home");
        const usedRam = ns.getServerUsedRam("home");
        const freeRam = totalRam - usedRam;

        const processes = ns.ps("home");
        let workerRamUsage = 0;

        for (const process of processes) {
            if (process.filename === "/botnet/scripts/worker.js") {
                workerRamUsage += process.threads * ns.getScriptRam(process.filename);
            }
        }

        await sendToCommunications("INFO", `Total RAM: ${totalRam.toFixed(2)}GB, Used: ${usedRam.toFixed(2)}GB, Free: ${freeRam.toFixed(2)}GB.`);
        await sendToCommunications("INFO", `worker.js RAM Usage: ${workerRamUsage.toFixed(2)}GB.`);

        if (workerRamUsage > bufferRam) {
            await sendToCommunications("WARN", `worker.js processes are using ${workerRamUsage.toFixed(2)}GB, exceeding the buffer of ${bufferRam.toFixed(2)}GB.`);
        }
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\nmemoryIntel=ON\n\n# System Run Variables\nhomeWorkerRam=64\nportAssignments={}`;
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
