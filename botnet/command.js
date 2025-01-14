// File: botnet/command.js
// Description: Main script that manages the botnet system, dynamically detects and starts services based on configuration.

/** @param {NS} ns **/
export async function main(ns) {
    const CONFIG_PATH = "/data/config.txt";
    const ACTIVE_SERVERS_PATH = "/data/activeServers.txt";
    const SERVICE_DIR = "/botnet/services/";
    const COMMUNICATIONS_PATH = "/botnet/services/communications.js";

    ns.tprint("[Command.js] Starting botnet control script...");

    // Ensure configuration file exists and load configuration
    await ensureDefaultConfig(ns, CONFIG_PATH);
    let config = await readConfigFile(ns, CONFIG_PATH);

    // Start communications service if enabled
    if (config["communication"] === "ON") {
        if (!ns.isRunning(COMMUNICATIONS_PATH, "home")) {
            const commPid = ns.exec(COMMUNICATIONS_PATH, "home", 1);
            if (commPid === 0) {
                ns.tprint("[ERROR] Failed to start Communications.js. Exiting...");
                return;
            }
            ns.tprint("[SUCCESS] Communications service started.");
        }
    } else {
        ns.tprint("[WARN] Communications service is disabled in config.txt.");
    }

    // Load list of services
    const services = ns.ls("home", SERVICE_DIR).filter(file => file.endsWith(".js"));
    const activeServices = {};

    for (const serviceFile of services) {
        const serviceName = serviceFile.replace(SERVICE_DIR, "").replace(".js", "");
        if (config[serviceName] === "ON") {
            const servicePath = `${SERVICE_DIR}${serviceFile}`;
            if (!ns.fileExists(servicePath)) {
                ns.tprint(`[ERROR] Service script ${servicePath} does not exist.`);
                continue;
            }
            const requiredRam = ns.getScriptRam(servicePath, "home");
            const availableRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");
            if (availableRam < requiredRam) {
                ns.tprint(`[WARN] Insufficient RAM to start ${serviceName}. Skipping...`);
                continue;
            }
            const pid = ns.exec(servicePath, "home", 1);
            if (pid === 0) {
                ns.tprint(`[ERROR] Failed to start service: ${serviceName}`);
            } else {
                ns.tprint(`[SUCCESS] Service ${serviceName} started successfully.`);
                activeServices[serviceName] = pid;
            }
        } else {
            ns.tprint(`[INFO] Service ${serviceName} is disabled.`);
        }
    }

    await ns.write(ACTIVE_SERVERS_PATH, JSON.stringify(activeServices, null, 2), "w");

    // Operations loop to monitor and report
    ns.tprint("[Command.js] Entering operations loop...");

    while (true) {
        config = await readConfigFile(ns, CONFIG_PATH);
        const totalRam = ns.getServerMaxRam("home");
        const usedRam = ns.getServerUsedRam("home");
        const freeRam = totalRam - usedRam;

        if (config["communication"] === "ON") {
            await sendToCommunications(ns, "[INFO]", `Total RAM: ${totalRam.toFixed(2)}GB, Used: ${usedRam.toFixed(2)}GB, Free: ${freeRam.toFixed(2)}GB.`);
        }

        await ns.sleep(10000); // Sleep 10 seconds before next iteration
    }
}

async function ensureDefaultConfig(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\n\n# Memory and RAM Allocation\nhomeWorkerRam=64.00\ncomputerCost=1\nserverCost=10\nprogramCost=5\ncontractMinTries=3\n\n# Service Toggles\ncommunication=ON\ncompromiseDevice=ON\nhacknetManager=ON\nprogramManager=ON\nupgradeManager=ON\nserverManager=ON\ncontractSolver=ON\ncontrol=ON\nincomeIntel=ON\nexperienceInformation=ON\nmemoryIntel=ON\nfactionManager=ON\naugmentationManager=ON\nstockManager=ON\n\n# Reporting Intervals (in minutes)\nfactionReportInterval=5\naugmentationReminderInterval=30\n\n# Port Assignments\nportAssignments={\n    "communication": [1],\n    "worker": [2, 3, 4],\n    "control": [5],\n    "reporting": [6]\n}\n`;
        await ns.write(path, defaultConfig, "w");
    }
}

async function readConfigFile(ns, path) {
    const content = await ns.read(path);
    const configLines = content.split("\n").filter(line => line.trim() && !line.startsWith("#"));
    const config = {};
    for (const line of configLines) {
        const [key, value] = line.split("=").map(s => s.trim());
        config[key] = value;
    }
    return config;
}

async function sendToCommunications(ns, level, message) {
    const formattedMessage = `${level} ${message}`;
    await ns.writePort(1, formattedMessage);
}
