/**
 * Script: command.js
 * Description: Main command and control script for managing all automation plugins.
 * Handles the timing and execution of all operations, including compromise, purchase, and contract solving.
 * @param {NS} ns
 */
export async function main(ns) {
    ns.disableLog("ALL");

    const pluginCadences = {
        compromiseDevices: 30, // Seconds
        purchaseServers: 60, // Seconds
        contractDetection: 45, // Seconds
        solveContract: 5 // Seconds
    };

    const pluginTimestamps = {
        compromiseDevices: 0,
        purchaseServers: 0,
        contractDetection: 0,
        solveContract: 0
    };

    const activeServersFile = "/data/activeServers.txt";

    while (true) {
        const currentTime = Date.now() / 1000;
        ns.print(`[DEBUG] Main loop iteration at ${new Date().toLocaleTimeString()}.`);

        if (currentTime - pluginTimestamps.compromiseDevices >= pluginCadences.compromiseDevices) {
            ns.print("[INFO] Running compromiseDevices.js.");
            const serversToCompromise = ns.scan("home"); // Example scanning
            for (const server of serversToCompromise) {
                if (!ns.hasRootAccess(server)) ns.run("scripts2/compromiseDevices.js", 1, server);
            }
            pluginTimestamps.compromiseDevices = currentTime;
        }

        if (currentTime - pluginTimestamps.purchaseServers >= pluginCadences.purchaseServers) {
            ns.print("[INFO] Running purchaseServers.js.");
            ns.run("scripts2/purchaseServers.js");
            pluginTimestamps.purchaseServers = currentTime;
        }

        /*
        if (currentTime - pluginTimestamps.contractDetection >= pluginCadences.contractDetection) {
            ns.print("[INFO] Running contractDetection.js.");
            ns.run("scripts2/intel/contractDetection.js");
            pluginTimestamps.contractDetection = currentTime;
        }


        if (currentTime - pluginTimestamps.solveContract >= pluginCadences.solveContract) {
            ns.print("[INFO] Running solveContract.js.");
            ns.run("scripts2/helpers/solveContract.js");
            pluginTimestamps.solveContract = currentTime;
        }*/

        // Wait before next iteration
        await ns.sleep(1000);
    }
}
