// File: botnet/services/control.js
// Description: Control service to execute botnet commands against targets and distribute work across the botnet.

/** @param {NS} ns **/
export async function main(ns) {
    const ACTIVE_SERVERS_PATH = "/data/activeServers.txt";
    const CONFIG_PATH = "/data/config.txt";
    const WORKER_SCRIPT_PATH = "/botnet/scripts/worker.js";

    // Read configuration
    let config = await readConfigFile(ns, CONFIG_PATH);
    const portAssignments = JSON.parse(config["portAssignments"] || "{}");
    const commPort = portAssignments.communication ? portAssignments.communication[0] : 1;

    async function sendToCommunications(level, message) {
        const formattedMessage = `[${level}] ${message}`;
        await ns.writePort(commPort, formattedMessage);
    }

    async function getActiveServers() {
        if (!ns.fileExists(ACTIVE_SERVERS_PATH)) {
            await ns.write(ACTIVE_SERVERS_PATH, "{}", "w");
        }
        const content = await ns.read(ACTIVE_SERVERS_PATH);
        return JSON.parse(content || "{}");
    }

    await sendToCommunications("INFO", "Control service started.");

    while (true) {
        // Refresh the active servers
        const activeServers = await getActiveServers();
        const servers = Object.keys(activeServers);

        // Deploy worker.js to all servers
        for (const server of servers) {
            if (!ns.fileExists(WORKER_SCRIPT_PATH, server)) {
                await ns.scp(WORKER_SCRIPT_PATH, "home", server);
                await sendToCommunications("INFO", `Deployed worker.js to ${server}.`);
            }
        }

        // Read available RAM for each server and calculate optimal distribution
        let totalThreads = 0;
        const serverThreads = {};
        for (const server of servers) {
            const maxRam = ns.getServerMaxRam(server);
            const usedRam = ns.getServerUsedRam(server);
            const availableRam = maxRam - usedRam;
            const threads = Math.floor(availableRam / ns.getScriptRam(WORKER_SCRIPT_PATH));
            if (threads > 0) {
                serverThreads[server] = threads;
                totalThreads += threads;
            }
        }

        // Refresh target list and get security/money data
        const targets = ns.scan("home").filter(target => ns.hasRootAccess(target) && ns.getServerMaxMoney(target) > 0);
        const targetData = targets.map(target => ({
            name: target,
            maxMoney: ns.getServerMaxMoney(target),
            currentMoney: ns.getServerMoneyAvailable(target),
            minSecurity: ns.getServerMinSecurityLevel(target),
            currentSecurity: ns.getServerSecurityLevel(target)
        }));

        targetData.sort((a, b) => b.maxMoney - a.maxMoney); // Prioritize highest max money targets

        // Distribute grow(), hack(), weaken() commands
        let allocatedThreads = 0;
        for (const target of targetData) {
            const weakenThreads = Math.ceil((target.currentSecurity - target.minSecurity) / 0.05);
            const growThreads = Math.ceil(ns.growthAnalyze(target.name, target.maxMoney / Math.max(1, target.currentMoney)));
            const hackThreads = Math.ceil(ns.hackAnalyzeThreads(target.name, target.currentMoney * 0.1));

            for (const server of Object.keys(serverThreads)) {
                let availableThreads = serverThreads[server];
                const port = portAssignments[server] ? portAssignments[server][0] : commPort;
                
                if (availableThreads <= 0) continue;

                // Assign weaken
                const weakenExec = Math.min(availableThreads, weakenThreads);
                if (weakenExec > 0) {
                    ns.exec(WORKER_SCRIPT_PATH, server, weakenExec, "weaken", target.name, port);
                    allocatedThreads += weakenExec;
                    availableThreads -= weakenExec;
                }

                // Assign grow
                const growExec = Math.min(availableThreads, growThreads);
                if (growExec > 0) {
                    ns.exec(WORKER_SCRIPT_PATH, server, growExec, "grow", target.name, port);
                    allocatedThreads += growExec;
                    availableThreads -= growExec;
                }

                // Assign hack
                const hackExec = Math.min(availableThreads, hackThreads);
                if (hackExec > 0) {
                    ns.exec(WORKER_SCRIPT_PATH, server, hackExec, "hack", target.name, port);
                    allocatedThreads += hackExec;
                    availableThreads -= hackExec;
                }

                serverThreads[server] = availableThreads;
            }
        }

        // Log allocation report
        await sendToCommunications("INFO", `Allocation completed. Total threads allocated: ${allocatedThreads}.`);

        await ns.sleep(30000); // Sleep for 30 seconds before re-evaluating
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\ncontrol=ON\n\n# System Run Variables\nportAssignments={}`;
        await ns.write(path, defaultConfig, "w");
    }
    const content = await ns.read(path);
    const configLines = content.split("\n").filter(line => line.trim() && !line.startsWith("#"));
    const config = {};
    for (const line of configLines) {
        const [key, value] = line.split("=").map(s => s.trim());
        config[key] = value;
    }
    return config;
}
