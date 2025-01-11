// /scripts3/command.js
// Description: Main control script that manages all components, monitors configuration, and handles system-wide resource allocation.
// Parameters: None.

/** GLOBAL VARIABLES */
const CONFIG_PATH = "/data/config.txt";
const ACTIVE_SERVERS_FILE = "/data/activeServers.txt";
const CONTRACTS_FILE = "/data/contracts.txt"; // Added contracts log file.
const RAM_ALLOCATION_FILE = "/data/workerRam.txt"; // File to store allocated RAM values for home.
const PROCESSES_TO_MONITOR = []; // Dynamically populated based on config
const RESERVED_RAM_HOME = 32; // Reserved RAM for essential processes on home (adjusted to a more general 16 GB).
const HOME_RAM_ALLOCATION_PERCENT = 0.75; // Percentage of remaining home RAM to allocate to worker.js.
const HOME_RAM_UPDATE_INTERVAL = 300000; // 5 minutes for updating RAM allocation during gameplay.
let shutdownRequested = false; // Tracks if a shutdown has been requested.
let lastHomeRamUpdateTime = 0; // Tracks last time home RAM allocation was updated.

// Timing cadences (in milliseconds)
const COMPROMISE_INTERVAL = 300000; // 5 minutes
const CONTRACT_INTERVAL = 40000; // slightly more than 5 minutes
const HACKNET_INTERVAL = 50000; // slightly more than contract interval
const HACKNET_CHECK_INTERVAL = 60000;
const PURCHASE_INTERVAL = 70000; // 1 minute
const INTEL_REPORT_INTERVAL = 900000; // 15 minutes
const INTEL_POLL_INTERVAL = 5000; // 5 seconds
const MAIN_LOOP_INTERVAL = 5000; // Main control loop interval

// Random delay range (in milliseconds)
const RANDOM_DELAY_MIN = 1000; // 1 second
const RANDOM_DELAY_MAX = 5000; // 5 seconds

// Last execution timestamps
let lastCompromiseTime = 0;
let lastPurchaseTime = 0;
let lastIntelReportTime = 0;
let lastHacknetCheck = 0;

// Default configuration (in case the file does not exist or is corrupted)
let config = {
    compromiseDevices: false,
    hacknetManager: false,
    purchaseServers: false,
    intelManager: false,
    contractSolver: false,
    stockManager: false,
    control: false,
    processMonitor: false,
    shutdown: false,
    useExtra: false
};

/**
 * Checks that the necessary directories and files exist. Creates them if they do not.
 */
async function ensureFileStructure(ns) {
    if (!await ns.fileExists(CONFIG_PATH)) {
        ns.print(`[WARN] Configuration file not found at ${CONFIG_PATH}. Creating default config.`);
        const defaultConfig = `compromiseDevices=OFF\nhacknetManager=OFF\npurchaseServers=OFF\nintelManager=OFF\ncontractSolver=OFF\nstockManager=OFF\ncontrol=OFF\nshutdown=OFF\nuseExtra=OFF\nprocessMonitor=OFF`;
        await ns.write(CONFIG_PATH, defaultConfig, "w");
    }

    if (!await ns.fileExists(ACTIVE_SERVERS_FILE)) {
        ns.print(`[INFO] Creating ${ACTIVE_SERVERS_FILE} as an empty file.`);
        await ns.write(ACTIVE_SERVERS_FILE, "", "w");
    }

    if (!await ns.fileExists(CONTRACTS_FILE)) {
        ns.print(`[INFO] Creating ${CONTRACTS_FILE} as an empty file.`);
        await ns.write(CONTRACTS_FILE, "{}", "w");
    }

    if (!await ns.fileExists(RAM_ALLOCATION_FILE)) {
        ns.print(`[INFO] Creating ${RAM_ALLOCATION_FILE} with initial allocation.`);
        await ns.write(RAM_ALLOCATION_FILE, "0", "w");
    }
}

/**
 * Reads and parses the configuration file.
 */
async function readConfig(ns) {
    try {
        if (await ns.fileExists(CONFIG_PATH)) {
            const data = await ns.read(CONFIG_PATH).trim();
            const lines = data.split("\n");
            lines.forEach(line => {
                const [key, value] = line.split("=");
                if (config.hasOwnProperty(key.trim())) {
                    config[key.trim()] = value.trim().toUpperCase() === "ON";
                }
            });
            return config;
        } else {
            ns.print(`[WARN] Configuration file not found at ${CONFIG_PATH}. Using defaults.`);
        }
    } catch (err) {
        ns.print(`[ERROR] Failed to read configuration file: ${err}`);
    }
}

/**
 * Writes the allocated RAM for home to the RAM_ALLOCATION_FILE.
 * @param {NS} ns - Bitburner namespace.
 * @param {number} allocatedRam - The amount of RAM to allocate.
 */
async function writeAllocatedRam(ns, allocatedRam) {
    try {
        await ns.write(RAM_ALLOCATION_FILE, allocatedRam.toFixed(2), "w");
        ns.print(`[INFO] Written allocated RAM to file: ${allocatedRam} GB.`);
    } catch (err) {
        ns.print(`[ERROR] Failed to write allocated RAM: ${err}`);
    }
}

/**
 * Updates home RAM allocation and writes it to the file.
 */
async function updateHomeRamAllocation(ns) {
    const currentTime = Date.now();
    if (currentTime - lastHomeRamUpdateTime < HOME_RAM_UPDATE_INTERVAL) {
        return; // Skip update if within interval.
    }

    const maxRam = ns.getServerMaxRam("home");
    const usedRam = ns.getServerUsedRam("home");
    const availableRam = maxRam - usedRam - RESERVED_RAM_HOME;
    const allocatedRam = Math.max(0, Math.floor(availableRam * HOME_RAM_ALLOCATION_PERCENT));

    ns.print(`[INFO] Home server RAM status updated: Total: ${maxRam} GB, Used: ${usedRam} GB, Reserved: ${RESERVED_RAM_HOME} GB, Allocated for worker.js: ${allocatedRam} GB.`);

    await writeAllocatedRam(ns, allocatedRam);
    lastHomeRamUpdateTime = currentTime;
}

/**
 * Updates a specific key-value pair in the configuration file.
 * @param {NS} ns - Bitburner namespace.
 * @param {string} key - Configuration key.
 * @param {string} value - Configuration value.
 */
async function updateConfig(ns, key, value) {
    const configData = await ns.read(CONFIG_PATH).trim();
    let updatedConfig = "";

    if (configData) {
        const lines = configData.split("\n");
        const updatedLines = lines.map(line => {
            const [k, v] = line.split("=");
            return k.trim() === key ? `${k}=${value.toUpperCase()}` : line;
        });
        updatedConfig = updatedLines.join("\n");
    } else {
        updatedConfig = `${key}=${value.toUpperCase()}`;
    }

    await ns.write(CONFIG_PATH, updatedConfig, "w");
    ns.print(`[INFO] Updated configuration: ${key} set to ${value.toUpperCase()}.`);
}

/**
 * Generates a random delay between RANDOM_DELAY_MIN and RANDOM_DELAY_MAX.
 * @returns {number} A random delay in milliseconds.
 */
function getRandomDelay() {
    return Math.floor(Math.random() * (RANDOM_DELAY_MAX - RANDOM_DELAY_MIN + 1)) + RANDOM_DELAY_MIN;
}

/**
 * Reads the list of active servers.
 */
async function readActiveServers(ns) {
    if (!await ns.fileExists(ACTIVE_SERVERS_FILE)) {
        ns.print(`[INFO] ${ACTIVE_SERVERS_FILE} not found. Creating an empty file.`);
        await ns.write(ACTIVE_SERVERS_FILE, "", "w");
    }
    const data = await ns.read(ACTIVE_SERVERS_FILE).trim();
    return data ? data.split("\n") : [];
}

/**
 * Adds or removes a server from the activeServers.txt list.
 * Ensures no duplicates and handles removal gracefully.
 * @param {NS} ns - Bitburner namespace.
 * @param {string} serverName - The name of the server to add or remove.
 * @param {string} action - "add" to add the server, "remove" to remove it.
 */
async function toggleServerInActiveList(ns, serverName, action) {
    const activeServers = await readActiveServers(ns);

    if (action === "add" && !activeServers.includes(serverName)) {
        ns.print(`[INFO] Adding ${serverName} to active servers.`);
        activeServers.push(serverName);
        await ns.write(ACTIVE_SERVERS_FILE, [...new Set(activeServers)].join("\n"), "w");
    } else if (action === "remove" && activeServers.includes(serverName)) {
        ns.print(`[INFO] Removing ${serverName} from active servers.`);
        const updatedServers = activeServers.filter(server => server !== serverName);
        await ns.write(ACTIVE_SERVERS_FILE, updatedServers.join("\n"), "w");
    } 
}

async function getAllocatedRam(ns) {
    const currentTime = Date.now();
    if (currentTime - lastHomeRamUpdateTime < HOME_RAM_UPDATE_INTERVAL) {
        return; // Skip update if within interval.
    }

    const maxRam = ns.getServerMaxRam("home");
    const usedRam = ns.getServerUsedRam("home");
    const availableRam = maxRam - usedRam - RESERVED_RAM_HOME;
    const allocatedRam = Math.floor(availableRam * HOME_RAM_ALLOCATION_PERCENT);

    ns.print(`[INFO] Home server RAM status updated: Total: ${maxRam} GB, Used: ${usedRam} GB, Reserved: ${RESERVED_RAM_HOME} GB, Allocated for control.js: ${allocatedRam} GB.`);

    lastHomeRamUpdateTime = currentTime;

    return allocatedRam;
}

/**
 * Terminates processes if their configuration setting is OFF.
 */
async function terminateDisabledProcesses(ns) {
    const runningProcesses = ns.ps("home");
    const config = await readConfig(ns);

    ns.print("[INFO] Checking for processes to terminate...");

    const services = [
        { key: "control.js", path: "scripts3/control.js" },
        { key: "intelManager.js", path: "scripts3/intelManager.js" },
        { key: "contractSolver.js", path: "scripts3/contractSolver.js" },
        { key: "hacknetManager.js", path: "scripts3/hacknetManager.js" },
        { key: "purchaseServers.js", path: "scripts3/purchaseServers.js" },
        { key: "stockManager.js", path: "scripts3/stockManager.js" }
    ];

    for (const service of services) {
        if (!config[service.key.replace(".js", "")]) {
            const processesToTerminate = runningProcesses.filter(p => p.filename.replace(/^\//, "") === service.path);
            processesToTerminate.forEach(p => {
                ns.print(`[INFO] Terminating ${service.key} with PID: ${p.pid} because it is set to OFF in config.txt.`);
                ns.kill(p.pid);
            });
        }
    }
}

/**
 * Executes the appropriate functions based on the current configuration and timing intervals.
 */
async function executeComponents(ns) {
    const currentTime = Date.now();

    await updateHomeRamAllocation(ns); // Ensure home RAM allocation is updated before execution

    // Execute compromiseDevices.js, contractSolver.js, and hacknetManager.js on a 5-minute interval with a random delay
    if (config.compromiseDevices && currentTime - lastCompromiseTime >= COMPROMISE_INTERVAL) {
        await ns.sleep(getRandomDelay());
        ns.print("[STAGE] Running Stage: Compromising Devices with compromiseDevices.js");
        ns.exec("/scripts3/compromiseDevices.js", "home");
        lastCompromiseTime = currentTime;
    }

    if (config.hacknetManager) {
        if (currentTime - lastCompromiseTime >= HACKNET_INTERVAL) {
            await ns.sleep(getRandomDelay());
            ns.print("[STAGE] Running Stage: Maximizing hacknet nodes with hacknetManager.js");
            ns.exec("/scripts3/hacknetManager.js", "home");
        }
    }

    // Execute purchaseServers.js on a 1-minute interval with a random delay
    if (config.purchaseServers && currentTime - lastPurchaseTime >= PURCHASE_INTERVAL) {
        await ns.sleep(getRandomDelay());
        ns.print("[STAGE] Running Stage: Purchasing upgrades for servers with purchaseServer.js");
        ns.exec("/scripts3/purchaseServers.js", "home");
        lastPurchaseTime = currentTime;
    }

    // Execute intelManager.js on a 15-minute reporting interval, with 5-second polling and random delay for reporting
    if (config.intelManager) {
        if (currentTime - lastIntelReportTime >= INTEL_REPORT_INTERVAL) {
            await ns.sleep(getRandomDelay());
            ns.print("[STAGE] Running Stage: Intelligence Report with intelManager.js");
            if (!ns.isRunning("/scripts3/intelManager.js", "home")) {
                ns.exec("/scripts3/intelManager.js", "home");
                ns.print("[INFO] intelManager.js started.");
            }
            lastIntelReportTime = currentTime;
        }
        await ns.sleep(INTEL_POLL_INTERVAL); // Poll every 5 seconds during the main loop
    }

    // Execute stockManager.js (no specific cadence provided)
    if (config.stockManager&& !ns.isRunning("/scripts3/stockManager.js", "home")) {
        await ns.sleep(getRandomDelay());
        ns.print("[STAGE] Running Stage: Optimizing stocks with stockManager.js");
        ns.exec("/scripts3/stockManager.js", "home");
    }

    if (config.contractSolver && !ns.isRunning("/scripts3/contractSolver.js", "home")) {
        await ns.sleep(getRandomDelay());
        ns.print("[STAGE] Running Stage: Detecting contracts with contractSolver.js");
        ns.exec("/scripts3/contractSolver.js", "home");
    }

    // Execute control.js for resource allocation
    if (config.control && !ns.isRunning("/scripts3/control.js", "home")) {
        await ns.sleep(getRandomDelay());
        const allocatedRam = await getAllocatedRam(ns) || 0;
        ns.print("[STAGE] Running Stage: Optimizing botnet nodes with control.js");
        ns.exec("/scripts3/control.js", "home", 1, allocatedRam); // Pass allocated RAM as an argument to control.js.
    }

    // Check for if utilizing excess resources has been enabled.
    if (config.useExtra) {
        await toggleServerInActiveList(ns, "home", "add");
    } else if (!config.useExtra) {
        await toggleServerInActiveList(ns, "home", "remove");
    } else {
        ns.print("[ERROR] Unable to toggle home server excess resource utilization.");
    }

    // Start processMonitor.js if enabled
    if (config.processMonitor && !ns.isRunning("/scripts3/processMonitor.js", "home")) {
        ns.print("[STAGE] Starting processMonitor.js to monitor system processes.");
        ns.exec("/scripts3/processMonitor.js", "home");
    }

    // Check for shutdown command and add debug info
    //ns.print(`[DEBUG] Checking shutdown in config: ${config.shutdown}`);
    if (config.shutdown) {
        ns.print("[INFO] Shutdown triggered from config file.");
        shutdownRequested = true;
    }
}

/**
 * Main function: periodically reads the configuration file and executes components accordingly.
 * @param {NS} ns - Bitburner namespace
 */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("[INFO] Starting command.js...");

    // Ensure necessary files and directories exist.
    await ensureFileStructure(ns);

    // For now, just add home to active servers, later, memory management
    //addHomeToActiveServers(ns);

    while (!shutdownRequested) {
        await readConfig(ns); // Load the latest configuration.

        // Execute components based on their timing intervals
        try {
            await executeComponents(ns);
        } catch (err) {
            ns.print(`[ERROR] An error occurred during execution: ${err.message}`);
        }

        // Terminate any processes that have been disabled
        await terminateDisabledProcesses(ns);

        await ns.sleep(MAIN_LOOP_INTERVAL); // Wait for the next cycle
    }

    ns.print("[INFO] command.js has shut down gracefully.");
}
