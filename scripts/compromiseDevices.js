// /scripts3/compromiseDevices.js
// Description: This script scans all servers and attempts to compromise any that are within hacking level and not yet in activeServers.txt.
// Parameters: None. This script is scheduled by command.js but can be run manually using `run /scripts3/compromiseDevices.js`.

/** GLOBAL VARIABLES */
const ACTIVE_SERVERS_FILE = "/data/activeServers.txt";
const REQUIRED_PROGRAMS = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];

/**
 * Reads or initializes the active servers file.
 */
async function readActiveServers(ns) {
    if (!await ns.fileExists(ACTIVE_SERVERS_FILE)) {
        ns.print(`[INFO] ${ACTIVE_SERVERS_FILE} not found. Creating an empty file.`);
        await ns.write(ACTIVE_SERVERS_FILE, "", "w");
    }
    const data = await ns.read(ACTIVE_SERVERS_FILE).trim();
    return data ? data.split("\n") : [];
}

/**
 * Adds or removes a server from the activeServers.txt list.
 * Ensures no duplicates and handles removal gracefully.
 * @param {NS} ns - Bitburner namespace.
 * @param {string} serverName - The name of the server to add or remove.
 * @param {string} action - "add" to add the server, "remove" to remove it.
 */
async function toggleServerInActiveList(ns, serverName, action) {
    const activeServers = await readActiveServers(ns);

    if (action === "add" && !activeServers.includes(serverName)) {
        ns.print(`[INFO] Adding ${serverName} to active servers.`);
        activeServers.push(serverName);
        await ns.write(ACTIVE_SERVERS_FILE, [...new Set(activeServers)].join("\n"), "w");
    } else if (action === "remove" && activeServers.includes(serverName)) {
        ns.print(`[INFO] Removing ${serverName} from active servers.`);
        const updatedServers = activeServers.filter(server => server !== serverName);
        await ns.write(ACTIVE_SERVERS_FILE, updatedServers.join("\n"), "w");
    } else {
        ns.print(`[INFO] No changes made for ${serverName} with action: ${action}`);
    }
}

/**
 * Attempts to open ports and nuke the server.
 */
async function attemptCompromise(ns, server) {
    let portsOpened = 0;
    REQUIRED_PROGRAMS.forEach(program => {
        if (ns.fileExists(program, "home")) {
            switch (program) {
                case "BruteSSH.exe":
                    ns.brutessh(server);
                    break;
                case "FTPCrack.exe":
                    ns.ftpcrack(server);
                    break;
                case "relaySMTP.exe":
                    ns.relaysmtp(server);
                    break;
                case "HTTPWorm.exe":
                    ns.httpworm(server);
                    break;
                case "SQLInject.exe":
                    ns.sqlinject(server);
                    break;
            }
            portsOpened++;
        }
    });

    if (portsOpened >= ns.getServerNumPortsRequired(server)) {
        ns.nuke(server);
        ns.tprint(`[SUCCESS] ${server} has been nuked.`);

        if (!ns.fileExists("/scripts3/worker.js", server)) {
            await ns.scp("/scripts3/worker.js", server, "home");
        }

        return true;
    } else {
        ns.print(`[WARN] ${server} could not be compromised (ports opened: ${portsOpened}).`);
        return false;
    }
}

/**
 * Main function: Scans all servers and compromises any eligible targets.
 * @param {NS} ns - Bitburner namespace
 */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("[INFO] Starting compromiseDevices.js...");

    const serversToScan = ["home"];
    const scannedServers = new Set();
    const activeServers = await readActiveServers(ns);

    while (serversToScan.length > 0) {
        const currentServer = serversToScan.pop();
        if (scannedServers.has(currentServer)) continue;
        scannedServers.add(currentServer);

        const connectedServers = ns.scan(currentServer);
        connectedServers.forEach(server => {
            if (!scannedServers.has(server)) {
                serversToScan.push(server);
            }
        });

        if (ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(currentServer) &&
            !ns.hasRootAccess(currentServer) &&
            !activeServers.includes(currentServer)) {
            const compromised = await attemptCompromise(ns, currentServer);
            if (compromised) {
                await toggleServerInActiveList(ns, currentServer, "add");
            }
        }
    }

    ns.print("[INFO] compromiseDevices.js has completed.");
}
