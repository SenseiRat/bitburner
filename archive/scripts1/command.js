/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const scripts = {
        hack: "scripts/hack.js",
        grow: "scripts/grow.js",
        weaken: "scripts/weaken.js",
        contractSolver: "scripts/contractSolver.js"
    };

    const homeRamBuffer = 32; // Leave some RAM for manual commands on home.
    const batchHackPercent = 0.1; // Hack percentage configurable for home automation.
    const reserveFunds = 1e9; // Reserve funds for augmentations.
    const baseServerRam = 8; // Starting RAM for new servers.
    const upgradeThreshold = 0.1; // Use 10% of available money for upgrades.
    let backdoorInstructionsPrinted = false;

    while (true) {
        logStats(ns);
        manageHacknet(ns);
        await solveContracts(ns, scripts);

        const purchasedServers = ns.getPurchasedServers();
        const serverLimit = ns.getPurchasedServerLimit();
        const maxServerRam = ns.getPurchasedServerMaxRam();

        // 1. Purchase new servers if below the limit
        if (purchasedServers.length < serverLimit) {
            for (let i = purchasedServers.length; i < serverLimit; i++) {
                if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(baseServerRam)) {
                    const newServerName = `pserv-${i}`;
                    ns.purchaseServer(newServerName, baseServerRam);
                    ns.tprint(`[INFO] Purchased new server: ${newServerName} with ${baseServerRam}GB RAM.`);
                    for (const script of Object.values(scripts)) {
                        await ns.scp(script, newServerName);
                    }
                }
            }
        }

        // 2. Upgrade existing servers if the cost is <= 10% of available money
        for (const server of purchasedServers) {
            const currentRam = ns.getServerMaxRam(server);
            const upgradeRam = currentRam * 2;
            const upgradeCost = ns.getPurchasedServerCost(upgradeRam);

            if (upgradeRam <= maxServerRam && ns.getServerMoneyAvailable("home") * upgradeThreshold >= upgradeCost) {
                ns.killall(server);
                ns.deleteServer(server);
                const upgradedServerName = server;
                ns.purchaseServer(upgradedServerName, upgradeRam);
                ns.tprint(`[INFO] Upgraded server: ${upgradedServerName} to ${upgradeRam}GB RAM.`);
                for (const script of Object.values(scripts)) {
                    await ns.scp(script, upgradedServerName);
                }
            }
        }

        const target = selectTarget(ns);

        for (const server of purchasedServers) {
            const freeRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const weakenRam = ns.getScriptRam(scripts.weaken);
            const growRam = ns.getScriptRam(scripts.grow);
            const hackRam = ns.getScriptRam(scripts.hack);

            if (freeRam < weakenRam) {
                ns.print(`[WARN] ${server} does not have enough RAM to run batch operations. Skipping...`);
                continue;
            }

            // Calculate optimal thread counts for the batch
            const moneyThresh = ns.getServerMaxMoney(target) * 0.75;
            const securityThresh = ns.getServerMinSecurityLevel(target) + 5;
            const currentSecurity = ns.getServerSecurityLevel(target);
            const currentMoney = ns.getServerMoneyAvailable(target) || 1;

            if (currentSecurity > securityThresh) {
                const weakenThreads = Math.ceil((currentSecurity - securityThresh) / ns.weakenAnalyze(1));
                ns.print(`[INFO] Weakening ${target} with ${weakenThreads} threads from ${server}.`);
                ns.exec(scripts.weaken, server, weakenThreads, target);
            } else if (currentMoney < moneyThresh) {
                const growthMultiplier = moneyThresh / currentMoney;
                if (!isFinite(growthMultiplier) || growthMultiplier < 1) {
                    ns.print(`[INFO] Skipping growth for ${target} as it is not needed.`);
                    continue;
                }
                const growThreads = Math.ceil(ns.growthAnalyze(target, growthMultiplier));
                const weakenAfterGrowThreads = Math.ceil((growThreads * ns.growthAnalyzeSecurity(1)) / ns.weakenAnalyze(1));
                ns.print(`[INFO] Growing ${target} with ${growThreads} threads from ${server} and weakening with ${weakenAfterGrowThreads} threads.`);
                ns.exec(scripts.grow, server, growThreads, target);
                ns.exec(scripts.weaken, server, weakenAfterGrowThreads, target);
            } else {
                const hackThreads = Math.floor(ns.hackAnalyzeThreads(target, ns.getServerMaxMoney(target) * batchHackPercent));
                const weakenAfterHackThreads = Math.ceil((hackThreads * ns.hackAnalyzeSecurity(1)) / ns.weakenAnalyze(1));
                if (hackThreads <= 0) {
                    ns.print(`[WARN] Not enough threads to hack ${target}. Skipping...`);
                    continue;
                }
                ns.print(`[INFO] Hacking ${target} with ${hackThreads} threads from ${server} and weakening with ${weakenAfterHackThreads} threads.`);
                ns.exec(scripts.hack, server, hackThreads, target);
                ns.exec(scripts.weaken, server, weakenAfterHackThreads, target);
            }

            await ns.sleep(100); // Slight delay to prevent RAM overflow
        }

        // Home server idle check
        const homeFreeRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home") - homeRamBuffer;
        if (homeFreeRam > ns.getScriptRam(scripts.hack)) {
            const homeHackThreads = Math.floor(homeFreeRam / ns.getScriptRam(scripts.hack));
            ns.print(`[INFO] Using home to hack ${target} with ${homeHackThreads} threads.`);
            ns.exec(scripts.hack, "home", homeHackThreads, target);
        }

        // Open ports and nuke non-purchased servers.
        const allServers = getAllServers(ns);
        for (const server of allServers) {
            if (purchasedServers.includes(server) || server === "home" || ns.hasRootAccess(server)) {
                continue;
            }

            const openPorts = openPortsIfPossible(ns, server);
            if (openPorts >= ns.getServerNumPortsRequired(server) && ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server)) {
                ns.nuke(server);
                ns.tprint(`[INFO] Nuked server: ${server}`);
            }

            if (ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server) && !ns.getServer(server).backdoorInstalled && !backdoorInstructionsPrinted) {
                ns.tprint(`[INFO] Unable to auto-backdoor ${server}. Please manually run:
1. connect ${server}
2. installBackdoor`);
                backdoorInstructionsPrinted = true;
            }
        }

        manageRamUsage(ns);
        safeguard(ns);

        await ns.sleep(5000);
    }
}

/**
 * Selects the optimal target for hacking based on max money and minimal security.
 * @param {NS} ns
 * @returns {string} The name of the optimal target server.
 */
function selectTarget(ns) {
    const potentialTargets = getAllServers(ns).filter(s => ns.getServerMaxMoney(s) > 0 && ns.hasRootAccess(s));

    let bestTarget = "joesguns"; // Default fallback target
    let maxMoney = 0;

    for (const server of potentialTargets) {
        const serverMaxMoney = ns.getServerMaxMoney(server);
        const serverSecurity = ns.getServerSecurityLevel(server);
        const minSecurity = ns.getServerMinSecurityLevel(server);

        if (serverMaxMoney > maxMoney && serverSecurity <= minSecurity + 5) {
            maxMoney = serverMaxMoney;
            bestTarget = server;
        }
    }

    ns.print(`[INFO] Best target selected: ${bestTarget}`);
    return bestTarget;
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

/**
 * Opens available ports on a server using executable programs.
 * @param {NS} ns
 * @param {string} server
 * @returns {number} Number of opened ports.
 */
function openPortsIfPossible(ns, server) {
    let openedPorts = 0;
    if (ns.fileExists("BruteSSH.exe", "home")) {
        ns.brutessh(server);
        openedPorts++;
    }
    if (ns.fileExists("FTPCrack.exe", "home")) {
        ns.ftpcrack(server);
        openedPorts++;
    }
    if (ns.fileExists("relaySMTP.exe", "home")) {
        ns.relaysmtp(server);
        openedPorts++;
    }
    if (ns.fileExists("HTTPWorm.exe", "home")) {
        ns.httpworm(server);
        openedPorts++;
    }
    if (ns.fileExists("SQLInject.exe", "home")) {
        ns.sqlinject(server);
        openedPorts++;
    }
    return openedPorts;
}

/**
 * Logs current script and server statistics.
 * @param {NS} ns
 */
function logStats(ns) {
    const income = ns.getScriptIncome();
    const expGain = ns.getScriptExpGain();
    const incomePerSec = income ? income[0] : 0;
    const hackExpPerSec = expGain || 0;
    ns.print(`[STATS] Income/sec: $${incomePerSec.toFixed(2)} | Exp/sec: ${hackExpPerSec.toFixed(2)}`);
}

/**
 * Manages RAM by terminating less critical scripts if memory is low.
 * @param {NS} ns
 */
function manageRamUsage(ns) {
    const usedRam = ns.getServerUsedRam("home");
    const maxRam = ns.getServerMaxRam("home");

    if (usedRam > maxRam * 0.9) {
        ns.tprint("[WARN] Low RAM detected. Freeing up resources...");
        ns.scriptKill("less_critical_script.js", "home");
    }
}

/**
 * Manages Hacknet nodes.
 * @param {NS} ns
 */
function manageHacknet(ns) {
    const maxNodes = ns.hacknet.maxNumNodes();
   
