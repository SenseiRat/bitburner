// /scripts3/control.js
// Description: Manages resource allocation of grow, weaken, and hack commands across all available servers, ensuring optimal targeting and resource balancing.

/** GLOBAL VARIABLES */
const ACTIVE_SERVERS_FILE = "/data/activeServers.txt";
const RAM_ALLOCATION_FILE = "/data/workerRam.txt"; // File to store allocated RAM values for home.
const COMM_PORT = 1; // Communication port for sending instructions to worker.js.
const WORKER_SCRIPT = "/scripts3/worker.js"; // General-purpose script for grow, weaken, and hack.

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
 * Reads allocated RAM for home from the RAM allocation file.
 */
async function readAllocatedRam(ns) {
    if (!await ns.fileExists(RAM_ALLOCATION_FILE)) {
        ns.print(`[INFO] ${RAM_ALLOCATION_FILE} not found. Defaulting allocated RAM to 0.`);
        return 0;
    }
    const data = await ns.read(RAM_ALLOCATION_FILE).trim();
    const allocatedRam = parseFloat(data);
    return isNaN(allocatedRam) ? 0 : allocatedRam;
}

/**
 * Selects the most optimal targets based on money available and minimum security levels.
 */
function selectOptimalTargets(ns) {
    const servers = ns.scan("home").filter(server => ns.hasRootAccess(server));
    const targetStats = servers.map(server => ({
        name: server,
        maxMoney: ns.getServerMaxMoney(server),
        minSecurity: ns.getServerMinSecurityLevel(server),
        currentMoney: ns.getServerMoneyAvailable(server),
        currentSecurity: ns.getServerSecurityLevel(server)
    })).filter(server => server.maxMoney > 0);

    targetStats.sort((a, b) => b.maxMoney / b.minSecurity - a.maxMoney / a.minSecurity);

    const optimalTargets = targetStats.slice(0, 3).map(target => target.name); // Top 3 optimized targets.

    // Add fallback targets if no optimal targets found.
    if (optimalTargets.length === 0) {
        ns.print("[WARN] No valid targets found. Using fallback targets.");
        return ["n00dles", "foodnstuff", "sigma-cosmetics"];
    }

    return optimalTargets;
}

/**
 * Sends instructions to worker.js through the communication port.
 */
async function sendInstructions(ns, target, action) {
    const message = JSON.stringify({ target, action });
    if (!ns.tryWritePort(COMM_PORT, message)) {
        ns.print(`[WARN] Port ${COMM_PORT} is full. Skipping instruction transmission.`);
    } else {
        ns.print(`[INFO] Sent instructions: target=${target}, action=${action}`);
    }
}

/**
 * Ensures that worker.js is running on the server with the specified threads.
 */
async function ensureWorkerRunning(ns, server, threads) {
    const isRunning = ns.ps(server).some(p => p.filename === WORKER_SCRIPT);

    if (!isRunning || server === "home") {
        ns.print(`[INFO] Starting or restarting worker.js on ${server} with ${threads} threads.`);
        ns.kill(WORKER_SCRIPT, server); // Kill any existing worker.js if needed.
        const pid = ns.exec(WORKER_SCRIPT, server, threads);

        if (pid === 0) {
            ns.print(`[ERROR] Failed to start worker.js on ${server}.`);
        } else {
            ns.print(`[INFO] Successfully started worker.js on ${server} with PID: ${pid}`);
        }
    }
}

/**
 * Allocates grow, weaken, and hack threads across the servers in the botnet.
 */
async function allocateResources(ns) {
    const activeServers = await readActiveServers(ns);

    if (activeServers.length === 0) {
        ns.print("[WARN] No active servers found.");
        return;
    }

    const optimalTargets = selectOptimalTargets(ns);

    // Read allocated RAM for home.
    const homeAllocatedRam = await readAllocatedRam(ns);
    const homeScriptRam = ns.getScriptRam(WORKER_SCRIPT);

    let weakenServers = 0;
    let growServers = 0;
    let hackServers = 0;

    for (const server of activeServers) {
        let availableRam;
        let threads;

        if (server === "home") {
            availableRam = homeAllocatedRam;
            threads = availableRam > 0 ? Math.floor(availableRam / homeScriptRam) : 0;
        } else {
            availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            threads = availableRam > 0 ? Math.floor(availableRam / homeScriptRam) : 0;
        }

        if (threads > 0) {
            const target = optimalTargets[Math.floor(Math.random() * optimalTargets.length)];
            const action = "weaken"; // Default action; can be updated later for better management.

            if (action === "weaken") weakenServers++;
            else if (action === "grow") growServers++;
            else if (action === "hack") hackServers++;

            await ensureWorkerRunning(ns, server, threads);
            await sendInstructions(ns, target, action);
        } else {
            ns.print(`[WARN] Not enough RAM on ${server} to run worker.js.`);
        }
    }

    ns.print(`[INFO] Resource allocation completed. Stats:`);
    ns.print(`Weaken Servers: ${weakenServers}, Grow Servers: ${growServers}, Hack Servers: ${hackServers}`);
}

/**
 * Main function: Controls the allocation of resources to grow, weaken, and hack targets.
 * Ensures only one instance is running at a time.
 * @param {NS} ns - Bitburner namespace.
 */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("[INFO] Starting control.js...");

    const scriptName = ns.getScriptName();
    const pid = ns.getRunningScript().pid;

    if (ns.ps("home").filter(p => p.filename === scriptName && p.pid !== pid).length > 0) {
        ns.print("[WARN] Another instance of control.js is already running. Exiting...");
        return;
    }

    while (true) {
        await allocateResources(ns);
        await ns.sleep(10000); // Sleep for 10 seconds before reallocation.
    }
}
