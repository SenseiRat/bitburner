// File: botnet/command.js
// Description: Main script that manages the rest of the botnet system, dynamically detects and starts services based on configuration. This script includes a bootstrap phase, system phase, and operations loop.

/** @param {NS} ns **/
export async function main(ns) {
    const COMM_PREFIX = "[Command.js]";

    // Constants
    const CONFIG_PATH = "/data/config.txt";
    const ACTIVE_SERVICES_PATH = "/data/activeServices.txt";
    const CONTRACTS_PATH = "/data/contracts.txt";
    const SERVICE_DIR = "/botnet/services/";
    const COMMUNICATIONS_PATH = "/botnet/services/communications.js";

    let communicationsActive = false;
    let services = []; // Ensure services is defined globally for all sections

    // Bootstrap phase
    ns.tprint(`${COMM_PREFIX} [STAGE] Starting bootstrap phase...`);

    // Ensure file and directory structure exists
    await checkAndCreateFiles(ns, [CONFIG_PATH, ACTIVE_SERVICES_PATH, CONTRACTS_PATH]);
    await checkAndCreateDirs(ns, ["/data/logs/"]);

    // Read and ensure default config
    if (!ns.fileExists(CONFIG_PATH)) {
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\nhacknetNodes=10\nhacknetLevels=10\nhacknetRam=10\nhacknetCores=10\n\n# Service Toggles\ncommunication=ON\nhacknetManager=ON\n\n# System Run Variables\nhomeWorkerRam=0.00\nportAssignments={}`;
        await ns.write(CONFIG_PATH, defaultConfig, "w");
        ns.tprint(`${COMM_PREFIX} [INFO] Created default config at ${CONFIG_PATH}`);
    }
    let config = await readConfigFile(ns, CONFIG_PATH);

    // Calculate buffer RAM
    const totalRam = ns.getServerMaxRam("home");
    const bufferRam = Math.min(totalRam * 0.25, 64); // 25% of total RAM or 64GB
    const availableRam = totalRam - bufferRam;

    ns.tprint(`${COMM_PREFIX} [INFO] Total Home RAM: ${totalRam}GB, Buffer: ${bufferRam}GB, Available: ${availableRam}GB`);

    // Update RAM information in config.txt
    await updateConfigValue(ns, CONFIG_PATH, "homeWorkerRam", availableRam.toFixed(2));

    // Initialize communications
    if (!ns.fileExists(COMMUNICATIONS_PATH)) {
        ns.tprint(`${COMM_PREFIX} [ERROR] Missing communications script at ${COMMUNICATIONS_PATH}`);
        return;
    }
    ns.tprint(`${COMM_PREFIX} [STAGE] Loading communications module...`);
    const commPid = await ns.exec(COMMUNICATIONS_PATH, "home", 1);

    if (commPid === 0) {
        ns.tprint(`${COMM_PREFIX} [ERROR] Failed to start Communications.js. Terminating Command.js.`);
        return;
    } else {
        await sendToCommunications(ns, true, "[SUCCESS]", "Communications service started successfully.");
        communicationsActive = true;

        // Allocate and send initial port information to Communications.js
        services = await ns.ls("home", SERVICE_DIR).filter(file => file.endsWith(".js"));
        const portAssignments = {};
        let nextAvailablePort = 2; // Starting from port 2, assuming port 1 is for general communication.

        for (const service of services) {
            const serviceName = service.split("/").pop().replace(".js", "");

            // Determine the number of ports required from either header or config
            let portsNeeded = 1; // Default 1 port if unspecified
            if (config[`${serviceName}_ports`] !== undefined) {
                portsNeeded = parseInt(config[`${serviceName}_ports`], 10);
            } else {
                const headerComment = (await ns.read(`${SERVICE_DIR}${service}`)).split("\n").find(line => line.includes("Ports:"));
                if (headerComment) {
                    const match = headerComment.match(/Ports:\s*(\d+)/);
                    if (match) {
                        portsNeeded = parseInt(match[1], 10);
                    }
                }
            }

            const allocatedPorts = [];
            for (let i = 0; i < portsNeeded; i++) {
                allocatedPorts.push(nextAvailablePort);
                nextAvailablePort++;
            }
            portAssignments[serviceName] = allocatedPorts;
            await sendToCommunications(ns, communicationsActive, "[INFO]", `Allocated ports ${allocatedPorts.join(", ")} to ${serviceName}`);
        }

        // Update config.txt with port assignments
        await updateConfigValue(ns, CONFIG_PATH, "portAssignments", JSON.stringify(portAssignments));
        await sendToCommunications(ns, communicationsActive, "[SUCCESS]", "Port allocations complete.");
    }

    // System phase
    await sendToCommunications(ns, communicationsActive, "[STAGE]", "Entering system phase...");

    const activeServices = {};
    for (const service of services) {
        const serviceName = service.split("/").pop().replace(".js", "");
        if (config[serviceName] === "ON") {
            if (!ns.fileExists(`${service}`)) {
                await sendToCommunications(ns, communicationsActive, "[ERROR]", `Service script ${serviceName} does not exist.`);
                continue;
            }
            if (availableRam < ns.getScriptRam(`${service}.js`, "home")) {
                await sendToCommunications(ns, communicationsActive, "[ERROR]", `Insufficient RAM to start ${serviceName}.`);
                continue;
            }
            await sendToCommunications(ns, communicationsActive, "[INFO]", `Starting service: ${serviceName}`);
            const pid = await ns.exec(`${service}`, "home", 1);
            if (pid === 0) {
                await sendToCommunications(ns, communicationsActive, "[ERROR]", `Failed to start service: ${serviceName}`);
            } else {
                await sendToCommunications(ns, communicationsActive, "[SUCCESS]", `Service ${serviceName} started successfully.`);
                activeServices[serviceName] = pid;
            }
        }
    }
    await ns.write(ACTIVE_SERVICES_PATH, JSON.stringify(activeServices, null, 2), "w");

    // Operations phase
    await sendToCommunications(ns, communicationsActive, "[STAGE]", "Entering operations phase...");
    while (true) {
        try {
            await sendToCommunications(ns, communicationsActive, "[INFO]", "Checking for service signals...");
            await checkServiceSignals(ns);

            await sendToCommunications(ns, communicationsActive, "[INFO]", "Sending intel report...");
            await sendIntelReport(ns);

            const usedRam = ns.getServerUsedRam("home");
            const freeRam = totalRam - usedRam;
            await updateConfigValue(ns, CONFIG_PATH, "homeWorkerRam", freeRam.toFixed(2));

            await sendToCommunications(ns, communicationsActive, "[INFO]", "Performing maintenance and garbage collection...");
            await performMaintenance(ns);

            await handleConfigChanges(ns, CONFIG_PATH, services);

            await ns.sleep(1000);
        } catch (err) {
            await sendToCommunications(ns, communicationsActive, "[ERROR]", err.message);
        }
    }
}

async function checkAndCreateFiles(ns, files) {
    for (const file of files) {
        if (!ns.fileExists(file)) {
            await ns.write(file, "{}", "w");
            ns.tprint(`[Command.js] [INFO] Created missing file: ${file}`);
        }
    }
}

async function checkAndCreateDirs(ns, dirs) {
    for (const dir of dirs) {
        const dirFiles = await ns.ls("home", dir);
        if (dirFiles.length === 0) {
            await ns.write(`${dir}/placeholder.txt`, "", "w");
            ns.tprint(`[Command.js] [INFO] Created missing directory: ${dir}`);
        }
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

async function sendToCommunications(ns, isActive, level, message) {
    const formattedMessage = `${level} ${message}`;
    if (!isActive) {
        ns.tprint(formattedMessage);
    } else {
        ns.writePort(1, formattedMessage); // Sends message to Communications.js via port 1
    }
}

async function checkServiceSignals(ns) {
    await sendToCommunications(ns, true, "[INFO]", "Placeholder: Read service signals...");
}

async function sendIntelReport(ns) {
    await sendToCommunications(ns, true, "[INFO]", "Placeholder: Send intel report...");
}

async function performMaintenance(ns) {
    await sendToCommunications(ns, true, "[INFO]", "Placeholder: Perform maintenance tasks...");
}

async function handleConfigChanges(ns, configPath, services) {
    const newConfig = await readConfigFile(ns, configPath);
    for (const service of services) {
        const serviceName = service.replace("/botnet/services/", "").replace(".js", "");
        if (newConfig[serviceName] === "OFF") {
            const pids = ns.ps("home").filter(proc => proc.filename === `${SERVICE_DIR}${service}`).map(proc => proc.pid);
            for (const pid of pids) {
                ns.kill(pid);
                await sendToCommunications(ns, true, "[WARN]", `Sent halt signal to service: ${serviceName}`);
            }
        }
    }
}
