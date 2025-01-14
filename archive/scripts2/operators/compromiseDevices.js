/**
 * Script: compromiseDevices.js
 * Description: Compromises target servers and updates activeServers.txt.
 * Ensures activeServers.txt is maintained with server statuses.
 * @param {NS} ns
 */
export async function main(ns, targetServer) {
    const activeServersFile = "/data/activeServers.txt";

    // Read or create activeServers.txt
    let activeServers = [];
    if (ns.fileExists(activeServersFile)) {
        const fileContent = ns.read(activeServersFile).trim();
        activeServers = fileContent ? JSON.parse(fileContent) : [];
    }

    // Check if the server is already compromised
    let serverEntry = activeServers.find(s => s.server === targetServer);

    if (!serverEntry) {
        serverEntry = { server: targetServer, status: "OFF", hasContract: false };
        activeServers.push(serverEntry);
    }

    // Apply port-opening programs
    if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(targetServer);
    if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(targetServer);
    if (ns.fileExists("relaySMTP.exe", "home")) ns.relaysmtp(targetServer);
    if (ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(targetServer);
    if (ns.fileExists("SQLInject.exe", "home")) ns.sqlinject(targetServer);

    // Nuke the server if possible
    if (ns.getServerNumPortsRequired(targetServer) <= ns.getServerMinSecurityLevel("home")) {
        ns.nuke(targetServer);
        ns.print(`[INFO] Nuked ${targetServer}.`);

        // Mark the server as compromised and active
        serverEntry.status = "ON";
        await ns.write(activeServersFile, JSON.stringify(activeServers, null, 2), "w");
        ns.print(`[INFO] ${targetServer} added to activeServers.txt and set to 'ON'.`);
    } else {
        ns.print(`[WARN] Unable to nuke ${targetServer}. Not enough open ports or insufficient hacking level.`);
    }

    // Deploy scripts to the compromised server
    const scriptsToCopy = [
        "batch/grow.js",
        "batch/hack.js",
        "batch/weaken.js",
        "control.js"
    ];

    if (ns.hasRootAccess(targetServer)) {
        await ns.scp(scriptsToCopy, "home", targetServer);
        ns.print(`[INFO] Deployed scripts to ${targetServer}`);
    }
}
