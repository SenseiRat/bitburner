// File: botnet/services/communications.js
// Description: Communications service for handling logging and terminal output.

/** @param {NS} ns **/
export async function main(ns) {
    const CONFIG_PATH = "/data/config.txt";

    // Read configuration to get the allocated port for communications
    const config = await readConfigFile(ns, CONFIG_PATH);
    let commPort = 1; // Default port in case of missing config

    try {
        const portAssignments = JSON.parse(config["portAssignments"] || "{}");
        if (portAssignments.communication && portAssignments.communication.length > 0) {
            commPort = portAssignments.communication[0]; // Use the first assigned port for communications
        } else {
            ns.tprint("[ERROR] No communication port assigned in config.txt. Defaulting to port 1.");
        }
    } catch (err) {
        ns.tprint(`[ERROR] Failed to parse port assignments from config.txt: ${err.message}`);
    }

    const logPath = "/data/logs/communications_log.txt";

    // Function to rotate logs
    async function rotateLogs() {
        if (ns.fileExists(logPath)) {
            const oldLog = await ns.read(logPath);
            await ns.write(`old-${logPath}`, oldLog, "w");
            await ns.rm(logPath);
        }
    }

    await rotateLogs();
    ns.tprint(`[INFO] Communications service listening on port ${commPort}`);

    while (true) {
        const message = await ns.readPort(commPort);
        if (message === "NULL PORT DATA") {
            await ns.sleep(100); // No message, wait before checking again
            continue;
        }

        const logEntry = `[${new Date().toLocaleTimeString()}] ${message}`;
        const levelMatch = message.match(/^\[(\w+)\]/);
        const level = levelMatch ? levelMatch[1] : "INFO";

        switch (level) {
            case "ERROR":
            case "SUCCESS":
                ns.tprint(message); // Print important messages to terminal
                break;
            case "DEBUG":
                if (config["verbosity"] === "DEBUG") {
                    ns.print(message);
                }
                break;
            case "INFO":
                ns.print(message); // Log info-level messages to script log
                break;
            default:
                await ns.write(logPath, `${logEntry}\n`, "a");
                break;
        }
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\n\n# System Run Variables\nportAssignments={}`;
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
