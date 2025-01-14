/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    ns.tprint("[INFO] Starting real-time hacking statistics logging...");

    while (true) {
        const servers = getAllServers(ns);

        let totalHackingExpGain = 0;
        let totalMoneyGain = 0;

        for (const server of servers) {
            const hackExpGainRate = ns.getPlayer().hacking_exp_mult * ns.getServerGrowth(server) * 0.001; // Approximate exp gain formula
            const moneyGainRate = ns.getServerMoneyAvailable(server) * ns.hackAnalyze(server) * ns.getPlayer().hacking_money_mult;

            if (moneyGainRate > 0) {
                totalMoneyGain += moneyGainRate;
            }

            if (hackExpGainRate > 0) {
                totalHackingExpGain += hackExpGainRate;
            }
        }

        ns.clearLog();
        ns.print(`[STATS] Total Hacking Income Rate: $${totalMoneyGain.toFixed(2)}/s`);
        ns.print(`[STATS] Total Hacking EXP Gain Rate: ${totalHackingExpGain.toFixed(2)} EXP/s`);

        await ns.sleep(5000); // Update stats every 5 seconds
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
