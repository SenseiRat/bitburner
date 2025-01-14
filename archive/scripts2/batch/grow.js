/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];

    if (!target) {
        ns.tprint("[ERROR] No target specified. Usage: run grow.js [target]");
        return;
    }

    const maxThreads = ns.args[1] || 1; // Optional: Specify thread count if passed

    ns.tprint(`[INFO] Starting grow operation on ${target} with ${maxThreads} threads.`);

    try {
        await ns.grow(target, { threads: maxThreads });
        ns.tprint(`[SUCCESS] Successfully grew ${target}.`);
    } catch (error) {
        ns.tprint(`[ERROR] Failed to grow ${target}: ${error}`);
    }
}
