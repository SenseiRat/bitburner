/**
 * Script: control.js
 * Description: Controls batch operations across active servers.
 * Reads activeServers.txt to determine which servers to issue commands to.
 * @param {NS} ns
 */
export async function main(ns) {
    ns.disableLog("ALL");

    const activeServersFile = "/data/activeServers.txt";
    let activeServers = [];

    if (ns.fileExists(activeServersFile)) {
        const fileContent = ns.read(activeServersFile).trim();
        activeServers = fileContent ? JSON.parse(fileContent) : [];
    } else {
        ns.tprint("[WARN] activeServers.txt not found. Defaulting to purchased servers.");
        activeServers = ns.getPurchasedServers().map(server => ({ server, status: "ON", hasContract: false }));
    }

    const targetData = {
        grow: ns.args[0],
        hack: ns.args[1],
        weaken: ns.args[2]
    };

    if (!targetData.grow || !targetData.hack || !targetData.weaken) {
        ns.tprint("[ERROR] Missing targets. Usage: run control.js [grow] [hack] [weaken]");
        return;
    }

    // RAM requirements for batch scripts
    const growRam = ns.getScriptRam("batch/grow.js");
    const hackRam = ns.getScriptRam("batch/hack.js");
    const weakenRam = ns.getScriptRam("batch/weaken.js");

    for (const serverEntry of activeServers) {
        if (serverEntry.status !== "ON") {
            ns.print(`[INFO] Skipping ${serverEntry.server} as it is marked "${serverEntry.status}".`);
            continue;
        }

        const server = serverEntry.server;
        const maxRam = ns.getServerMaxRam(server);
        const usedRam = ns.getServerUsedRam(server);
        const freeRam = maxRam - usedRam;

        // Optimal thread allocation based on free RAM
        const maxGrowThreads = Math.floor(freeRam / growRam);
        const maxHackThreads = Math.floor(freeRam / hackRam);
        const maxWeakenThreads = Math.floor(freeRam / weakenRam);

        if (freeRam < Math.min(growRam, hackRam, weakenRam)) {
            ns.print(`[WARN] Not enough RAM on ${server} for any batch operation.`);
            continue;
        }

        ns.print(`[INFO] Server ${server} has ${freeRam.toFixed(2)} GB of free RAM.`);

        // Determine optimal batch distribution
        const allocation = determineOptimalAllocation(ns, [targetData.grow, targetData.hack, targetData.weaken], maxGrowThreads, maxHackThreads, maxWeakenThreads);

        if (allocation.growThreads > 0 && allocation.growTarget) {
            ns.print(`[DEBUG] Attempting to start grow.js on ${server} with ${allocation.growThreads} threads targeting ${allocation.growTarget}.`);
            if (!ns.exec("batch/grow.js", server, allocation.growThreads, allocation.growTarget)) {
                ns.print(`[ERROR] Failed to execute grow.js on ${server}.`);
            }
        }

        if (allocation.hackThreads > 0 && allocation.hackTarget) {
            ns.print(`[DEBUG] Attempting to start hack.js on ${server} with ${allocation.hackThreads} threads targeting ${allocation.hackTarget}.`);
            if (!ns.exec("batch/hack.js", server, allocation.hackThreads, allocation.hackTarget)) {
                ns.print(`[ERROR] Failed to execute hack.js on ${server}.`);
            }
        }

        if (allocation.weakenThreads > 0 && allocation.weakenTarget) {
            ns.print(`[DEBUG] Attempting to start weaken.js on ${server} with ${allocation.weakenThreads} threads targeting ${allocation.weakenTarget}.`);
            if (!ns.exec("batch/weaken.js", server, allocation.weakenThreads, allocation.weakenTarget)) {
                ns.print(`[ERROR] Failed to execute weaken.js on ${server}.`);
            }
        }
    }

    ns.tprint(`[INFO] Control.js completed dispatching optimized batch operations to active servers.`);
}

/**
 * Determines optimal allocation of grow, hack, and weaken threads based on available RAM and targets.
 * @param {NS} ns
 * @param {string[]} targets - List of target servers.
 * @param {number} maxGrowThreads - Max threads available for grow.
 * @param {number} maxHackThreads - Max threads available for hack.
 * @param {number} maxWeakenThreads - Max threads available for weaken.
 * @returns {Object} Optimal thread allocation and targets.
 */
function determineOptimalAllocation(ns, targets, maxGrowThreads, maxHackThreads, maxWeakenThreads) {
    const [growTarget, hackTarget, weakenTarget] = targets;

    return {
        growThreads: Math.min(maxGrowThreads, 1000), // Example cap
        hackThreads: Math.min(maxHackThreads, 1000),
        weakenThreads: Math.min(maxWeakenThreads, 1000),
        growTarget,
        hackTarget,
        weakenTarget
    };
}
