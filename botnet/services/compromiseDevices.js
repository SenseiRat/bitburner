// File: botnet/services/compromiseDevice.js
// Description: Service to automatically compromise new devices and add them to the botnet pool.

/** @param {NS} ns **/
export async function main(ns) {
    const ACTIVE_SERVERS_PATH = "/data/activeServers.txt";
    const CONFIG_PATH = "/data/config.txt";

    // Read configuration
    const config = await readConfigFile(ns, CONFIG_PATH);
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

    async function addServerToActiveList(serverName) {
        const activeServers = await getActiveServers();
        activeServers[serverName] = { compromised: true };
        await ns.write(ACTIVE_SERVERS_PATH, JSON.stringify(activeServers, null, 2), "w");
    }

    const programs = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];

    await sendToCommunications("INFO", "Compromise Device service started.");

    while (true) {
        const servers = ns.scan("home").concat(ns.scan().filter(host => host !== "home"));
        const activeServers = await getActiveServers();

        for (const server of servers) {
            if (!ns.hasRootAccess(server) && !activeServers[server]) {
                const requiredPorts = ns.getServerNumPortsRequired(server);
                let openPorts = 0;

                for (const program of programs) {
                    if (ns.fileExists(program, "home")) {
                        switch (program) {
                            case "BruteSSH.exe":
                                ns.brutessh(server);
                                openPorts++;
                                break;
                            case "FTPCrack.exe":
                                ns.ftpcrack(server);
                                openPorts++;
                                break;
                            case "relaySMTP.exe":
                                ns.relaysmtp(server);
                                openPorts++;
                                break;
                            case "HTTPWorm.exe":
                                ns.httpworm(server);
                                openPorts++;
                                break;
                            case "SQLInject.exe":
                                ns.sqlinject(server);
                                openPorts++;
                                break;
                        }
                    }
                }

                if (openPorts >= requiredPorts && ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server)) {
                    ns.nuke(server);
                    await sendToCommunications("SUCCESS", `Compromised server: ${server}.`);
                    await ns.scp("/botnet/scripts/worker.js", "home", server);
                    await addServerToActiveList(server);
                }
            }
        }

        await ns.sleep(60000); // Sleep for 1 minute before checking again.
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\ncompromiseDevice=ON\n\n# System Run Variables\nportAssignments={}`;
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
