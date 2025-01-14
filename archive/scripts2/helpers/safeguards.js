/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    ns.tprint("[INFO] Starting safeguards monitoring...");

    // Ensure that the script paths and filenames are consistent with your setup.
    const criticalScripts = [
        "/scripts/command.js",  // Ensure the correct directory if using subfolders
        "scripts/operators/purchaseServers.js",
        "scripts/operators/compromiseDevices.js",
        "scripts/operators/targetSelection.js",
        "scripts/batch/control.js",
        "scripts/batch/grow.js",
        "scripts/batch/hack.js",
        "scripts/batch/weaken.js",
        "scripts/helpers/deployTools.js",
        "scripts/intel/contractDetection.js",
        "scripts/helpers/solveContract.js"
    ];

    const checkInterval = 15000; // Check every 15 seconds
    const monitoredPorts = [1, 2, 3]; // Ports used for communication channels

    let logClearCounter = 0;
    const logClearInterval = 4; // Clear logs every 4 iterations (1 minute at 15s interval)

    while (true) {
        for (const script of criticalScripts) {
            const running = ns.ps("home").some(proc => proc.filename === script);

            if (!running) {
                ns.tprint(`[ERROR] Critical script ${script} is not running! Attempting to restart...`);
                try {
                    const freeRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");
                    const requiredRam = ns.getScriptRam(script);

                    if (freeRam >= requiredRam) {
                        ns.run(script);
                        ns.tprint(`[INFO] Successfully restarted ${script}.`);
                    } else {
                        ns.tprint(`[WARN] Not enough RAM to restart ${script}. Free RAM: ${freeRam.toFixed(2)} GB, Required RAM: ${requiredRam.toFixed(2)} GB.`);
                    }
                } catch (error) {
                    ns.tprint(`[FAIL] Unable to restart ${script}: ${error}`);
                }
            } else {
                ns.print(`[INFO] ${script} is running as expected.`);
            }
        }

        // Check for high port usage and clear monitored ports if needed
        for (const port of monitoredPorts) {
            if (!ns.readPort(port).trim()) {
                continue; // Port is not clogged
            }
            ns.clearPort(port);
            ns.print(`[INFO] Cleared data from monitored port ${port} to prevent overflow.`);
        }

        // Selectively clear logs at regular intervals to avoid losing too much historical information
        logClearCounter++;
        if (logClearCounter >= logClearInterval) {
            ns.clearLog();
            logClearCounter = 0;
        }

        await ns.sleep(checkInterval);
    }
}

/**
 * Recursively scans all servers starting from "home".
 * @param {NS} ns
 * @returns {string[]} List of all server names.
 */
function getAllServers(ns) {
    const visited = new Set();
    const stack = ["home"];
    while (stack.length > 0) {
        const server = stack.pop();
        if (!visited.has(server)) {
            visited.add(server);
            stack.push(...ns.scan(server));
        }
    }
    return Array.from(visited);
}
