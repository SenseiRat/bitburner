/**
 * Script: deployTools.js
 * Description: Deploys hacking scripts and updates activeServers.txt.
 * Ensures activeServers.txt is maintained with server statuses.
 * @param {NS} ns
 */
export async function main(ns, server) {
    const activeServersFile = "/data/activeServers.txt";

    // Read or create activeServers.txt
    let activeServers = [];
    if (ns.fileExists(activeServersFile)) {
        const fileContent = ns.read(activeServersFile).trim();
        activeServers = fileContent ? JSON.parse(fileContent) : [];
    }

    // Check if the server is already listed
    let serverEntry = activeServers.find(s => s.server === server);

    if (!serverEntry) {
        serverEntry = { server: server, status: "ON", hasContract: false };
        activeServers.push(serverEntry);
    } else {
        serverEntry.status = "ON"; // Ensure the server is marked as active after deployment
    }

    // Deploy tools to the server
    const scriptsToCopy = [
        "batch/grow.js",
        "batch/hack.js",
        "batch/weaken.js",
        "control.js"
    ];

    await ns.scp(scriptsToCopy, "home", server);
    ns.print(`[INFO] Deployed scripts to ${server}`);

    // Write updated activeServers list back to file
    await ns.write(activeServersFile, JSON.stringify(activeServers, null, 2), "w");

    ns.print(`[INFO] ${server} added to activeServers.txt and set to 'ON'.`);
}
