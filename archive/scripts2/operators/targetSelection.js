/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const hackingLevel = ns.getHackingLevel();

    // Collect all available servers
    const servers = getAllServers(ns).filter(server => ns.hasRootAccess(server) && ns.getServerMaxMoney(server) > 0);

    let bestGrowTarget = null;
    let bestHackTarget = null;
    let bestWeakenTarget = null;

    let maxGrowMultiplier = 0;
    let maxMoney = 0;
    let minSecurityDifference = Infinity;

    for (const server of servers) {
        const maxMoney = ns.getServerMaxMoney(server);
        const currentMoney = ns.getServerMoneyAvailable(server);
        const minSecurity = ns.getServerMinSecurityLevel(server);
        const currentSecurity = ns.getServerSecurityLevel(server);

        // Calculate the grow multiplier
        const growMultiplier = maxMoney / (currentMoney || 1);

        // Identify best grow target
        if (growMultiplier > maxGrowMultiplier && hackingLevel >= ns.getServerRequiredHackingLevel(server)) {
            maxGrowMultiplier = growMultiplier;
            bestGrowTarget = server;
        }

        // Identify best hack target (based on max money and security threshold)
        if (maxMoney > maxMoney && currentSecurity <= minSecurity + 5 && hackingLevel >= ns.getServerRequiredHackingLevel(server)) {
            maxMoney = maxMoney;
            bestHackTarget = server;
        }

        // Identify best weaken target (highest security above minimum)
        const securityDifference = currentSecurity - minSecurity;
        if (securityDifference > 0 && securityDifference < minSecurityDifference && hackingLevel >= ns.getServerRequiredHackingLevel(server)) {
            minSecurityDifference = securityDifference;
            bestWeakenTarget = server;
        }
    }

    // Log selected targets
    ns.print(`[INFO] Best grow target: ${bestGrowTarget}`);
    ns.print(`[INFO] Best hack target: ${bestHackTarget}`);
    ns.print(`[INFO] Best weaken target: ${bestWeakenTarget}`);

    // Write targets to ports for other scripts to use
    await ns.writePort(1, JSON.stringify({
        grow: bestGrowTarget || "",
        hack: bestHackTarget || "",
        weaken: bestWeakenTarget || ""
    }));
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
