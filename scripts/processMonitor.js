// /scripts3/processMonitor.js
// Description: Monitors and maintains the state of all key processes in the application, ensuring resiliency and error correction.

/** GLOBAL VARIABLES */
const CONFIG_PATH = "/data/config.txt";
let PROCESSES_TO_MONITOR = [
    { name: "command.js", path: "scripts3/command.js" },
    { name: "control.js", path: "scripts3/control.js" }
]; // Always monitor command.js and control.js
const WORKER_PROCESS = { name: "worker.js", path: "scripts3/worker.js" };
const CHECK_INTERVAL = 10000; // 10 seconds interval for process checks
const STARTUP_DELAY = 30000; // 30 seconds delay before monitoring starts
const RAM_BUFFER = 32; // Minimum reserved RAM for safety
const MAX_RAM_ALLOCATION_PERCENT = 0.75; // Max percentage of home RAM to allocate to worker.js

/**
 * Reads and parses the configuration file.
 */
async function readConfig(ns) {
    if (!await ns.fileExists(CONFIG_PATH)) {
        const defaultConfig = `compromiseDevices=OFF\nhacknetManager=OFF\npurchaseServers=OFF\nintelManager=OFF\ncontractSolver=OFF\nstockManager=OFF\ncontrol=OFF\nshutdown=OFF\nuseExtra=OFF`;
        await ns.write(CONFIG_PATH, defaultConfig, "w");
    }

    const data = await ns.read(CONFIG_PATH).trim();
    const config = {};
    data.split("\n").forEach(line => {
        const [key, value] = line.split("=");
        config[key.trim()] = value.trim().toUpperCase() === "ON";
    });

    return config;
}

/**
 * Populates PROCESSES_TO_MONITOR dynamically based on the configuration.
 */
async function updateProcessListFromConfig(ns) {
    const config = await readConfig(ns);

    // Always monitor command.js and control.js
    PROCESSES_TO_MONITOR = [
        { name: "command.js", path: "scripts3/command.js" },
        { name: "control.js", path: "scripts3/control.js" }
    ];

    const services = [
        { key: "intelManager.js", path: "scripts3/intelManager.js" }
        //{ key: "contractSolver.js", path: "scripts3/contractSolver.js" },
        //{ key: "hacknetManager.js", path: "scripts3/hacknetManager.js" },
        //{ key: "purchaseServers.js", path: "scripts3/purchaseServers.js" },
        //{ key: "stockManager.js", path: "scripts3/stockManager.js" }
    ];

    services.forEach(service => {
        if (config[service.key.replace(".js", "")]) {
            PROCESSES_TO_MONITOR.push({ name: service.key, path: service.path });
        }
    });
}

/**
 * Ensures a process is running; if not, attempts to restart it.
 */
async function ensureProcessRunning(ns, process) {
    const runningProcesses = ns.ps("home").map(p => p.filename.replace(/^\//, ""));

    if (!runningProcesses.includes(process.path)) {
        ns.print(`[WARN] ${process.name} not detected. Attempting to start...`);
        const pid = ns.exec(`/${process.path}`, "home");
        if (pid === 0) {
            ns.print(`[ERROR] Failed to start ${process.name}.`);
        } else {
            ns.print(`[INFO] ${process.name} started with PID: ${pid}.`);
        }
    }
}

/**
 * Adjusts RAM allocated to worker.js if home is low on available memory.
 */
async function adjustHomeRamAllocation(ns) {
    const maxRam = ns.getServerMaxRam("home");
    const usedRam = ns.getServerUsedRam("home");
    const availableRam = maxRam - usedRam;

    if (availableRam < RAM_BUFFER) {
        ns.print(`[WARN] Home server low on available RAM: ${availableRam} GB. Reducing allocation for worker.js.`);
        const newAllocation = Math.max(0, Math.floor((availableRam - RAM_BUFFER) * MAX_RAM_ALLOCATION_PERCENT));
        ns.print(`[INFO] Adjusted RAM allocation for worker.js to ${newAllocation} GB.`);
        await ns.write("/data/workerRam.txt", `${newAllocation}`, "w"); // Update file with new allocation
    }
}

/**
 * Adds or removes worker.js from the monitoring list based on home usage.
 */
async function updateWorkerMonitoring(ns) {
    const config = await readConfig(ns);

    const isWorkerMonitored = PROCESSES_TO_MONITOR.some(p => p.name === WORKER_PROCESS.name);

    if (config.useExtra && !isWorkerMonitored) {
        ns.print("[INFO] Adding worker.js to process monitoring.");
        PROCESSES_TO_MONITOR.push(WORKER_PROCESS);
    } else if (!config.useExtra && isWorkerMonitored) {
        ns.print("[INFO] Removing worker.js from process monitoring.");
        const index = PROCESSES_TO_MONITOR.findIndex(p => p.name === WORKER_PROCESS.name);
        PROCESSES_TO_MONITOR.splice(index, 1);

        const homeProcesses = ns.ps("home").filter(p => p.filename.replace(/^\//, "") === WORKER_PROCESS.path);
        homeProcesses.forEach(p => {
            ns.print(`[INFO] Terminating worker.js on home with PID: ${p.pid}`);
            ns.kill(p.pid);
        });
    }
}

/**
 * Main monitoring loop.
 */
async function monitorProcesses(ns) {
    ns.print(`[INFO] Waiting ${STARTUP_DELAY / 1000} seconds before monitoring starts...`);
    await ns.sleep(STARTUP_DELAY); // Wait for 30 seconds before monitoring starts.

    while (true) {
        const config = await readConfig(ns);

        if (config.shutdown) {
            ns.print("[INFO] Shutdown detected. Terminating process monitor.");
            return;
        }

        await updateProcessListFromConfig(ns); // Update the monitored processes dynamically
        await updateWorkerMonitoring(ns);
        await adjustHomeRamAllocation(ns); // Check and adjust home RAM allocation if needed

        for (const process of PROCESSES_TO_MONITOR) {
            await ensureProcessRunning(ns, process);
        }

        ns.print("[INFO] Monitoring cycle completed. Sleeping for the next check...");
        await ns.sleep(CHECK_INTERVAL);
    }
}

/**
 * Main function: Starts the process monitoring loop.
 * @param {NS} ns - Bitburner namespace.
 */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("[INFO] Starting processMonitor.js...");
    await monitorProcesses(ns);
}
