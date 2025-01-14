/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];

    if (!target) {
        ns.tprint("[ERROR] No target specified. Usage: run hack.js [target]");
        return;
    }

    const maxThreads = ns.args[1] || 1; // Optional: Specify thread count if passed

    ns.tprint(`[INFO] Starting hack operation on ${target} with ${maxThreads} threads.`);

    try {
        const stolenAmount = await ns.hack(target, { threads: maxThreads });
        ns.tprint(`[SUCCESS] Successfully hacked ${target}. Stolen: $${stolenAmount.toLocaleString()}`);
    } catch (error) {
        ns.tprint(`[ERROR] Failed to hack ${target}: ${error}`);
    }
}
