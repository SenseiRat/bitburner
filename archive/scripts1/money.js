/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const target = ns.args[0] || "joesguns"; // Default fallback target if not provided
    const hackPercent = ns.args[1] || 0.1; // Hack percentage configurable via argument

    while (true) {
        const moneyThresh = ns.getServerMaxMoney(target) * 0.75; // Money threshold at 75% of max money
        const securityThresh = ns.getServerMinSecurityLevel(target) + 5; // Security threshold slightly above min

        const currentSecurity = ns.getServerSecurityLevel(target);
        const currentMoney = ns.getServerMoneyAvailable(target) || 1; // Prevent divide-by-zero

        if (moneyThresh <= 0) {
            ns.tprint(`[ERROR] ${target} has no money to hack. Skipping...`);
            await ns.sleep(ns.getWeakenTime(target)); // Sleep based on weaken time
            continue;
        }

        if (currentSecurity > securityThresh) {
            const weakenThreads = Math.ceil((currentSecurity - securityThresh) / ns.weakenAnalyze(1));
            const weakenTime = ns.getWeakenTime(target);
            ns.tprint(`[INFO] Weakening ${target} with ${weakenThreads} threads. Time: ${weakenTime.toFixed(2)} ms.`);
            ns.exec("scripts/weaken.js", "home", weakenThreads, target);
            await ns.sleep(weakenTime);
        } else if (currentMoney < moneyThresh) {
            const growthMultiplier = moneyThresh / currentMoney;
            if (!isFinite(growthMultiplier) || growthMultiplier < 1) {
                ns.print(`[INFO] Skipping growth for ${target} as it is not needed.`);
                await ns.sleep(1000);
                continue;
            }
            const growThreads = Math.ceil(ns.growthAnalyze(target, growthMultiplier));
            const weakenAfterGrowThreads = Math.ceil((growThreads * ns.growthAnalyzeSecurity(1)) / ns.weakenAnalyze(1));
            const growTime = ns.getGrowTime(target);
            ns.tprint(`[INFO] Growing ${target} with ${growThreads} threads and weakening with ${weakenAfterGrowThreads} threads.`);
            ns.exec("scripts/grow.js", "home", growThreads, target);
            await ns.sleep(growTime);
            ns.exec("scripts/weaken.js", "home", weakenAfterGrowThreads, target);
            await ns.sleep(ns.getWeakenTime(target));
        } else {
            const hackThreads = Math.floor(ns.hackAnalyzeThreads(target, ns.getServerMaxMoney(target) * hackPercent));
            const weakenAfterHackThreads = Math.ceil((hackThreads * ns.hackAnalyzeSecurity(1)) / ns.weakenAnalyze(1));
            if (hackThreads <= 0) {
                ns.print(`[WARN] Not enough threads to hack ${target}. Skipping...`);
                await ns.sleep(1000);
                continue;
            }
            const hackTime = ns.getHackTime(target);
            ns.tprint(`[INFO] Hacking ${target} with ${hackThreads} threads and weakening with ${weakenAfterHackThreads} threads.`);
            ns.exec("scripts/hack.js", "home", hackThreads, target);
            await ns.sleep(hackTime);
            ns.exec("scripts/weaken.js", "home", weakenAfterHackThreads, target);
            await ns.sleep(ns.getWeakenTime(target));
        }

        await ns.sleep(500); // Small sleep to prevent infinite tight loop
    }
}
