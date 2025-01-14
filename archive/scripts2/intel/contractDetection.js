/**
 * Script: contractDetection.js
 * Description: Detects and reports active contracts on servers to prevent multiple simultaneous runs.
 * Handles proper formatting when sending contract data.
 * Consolidates server statuses into activeServers.txt for simplicity.
 * Replaces individual status files with centralized tracking.
 * @param {NS} ns
 */
export async function main(ns) {
    const lockFile = "/data/contractDetection-lock.txt"; // Use a valid file path in the `/data` directory

    if (ns.fileExists(lockFile)) {
        ns.print("[WARN] Contract detection is already running.");
        return;
    }

    await ns.write(lockFile, "running", "w"); // Create lock file

    try {
        // Contract detection logic
        const servers = ns.scan("home"); // Example scanning

        // Read or create the activeServers.txt to track active servers and statuses
        const activeServersFile = "/data/activeServers.txt";
        let activeServers = [];

        if (ns.fileExists(activeServersFile)) {
            const fileContent = ns.read(activeServersFile).trim();
            activeServers = fileContent ? JSON.parse(fileContent) : [];
        }

        for (const server of servers) {
            const contracts = ns.ls(server, ".cct");
            let serverStatus = activeServers.find(s => s.server === server);

            if (!serverStatus) {
                serverStatus = { server: server, status: "ON", hasContract: false };
                activeServers.push(serverStatus);
            }

            if (contracts.length > 0) {
                serverStatus.hasContract = true;
                for (const contract of contracts) {
                    ns.print(`[INFO] Found contract ${contract} on ${server}.`);

                    // Properly format and send data to the port as a JSON object
                    const contractData = {
                        filename: contract,
                        server: server
                    };

                    // Double-check the data formatting before sending
                    if (typeof contractData.filename !== "string" || typeof contractData.server !== "string") {
                        ns.print(`[ERROR] Invalid contract data format for ${contract} on ${server}. Skipping.`);
                        continue;
                    }

                    try {
                        const formattedData = `${contractData.server},${contractData.filename}`; // Send as a comma-separated string instead of JSON to match expectations
                        if (!formattedData) throw new Error("Formatted data is empty");
                        const success = ns.tryWritePort(2, formattedData);

                        if (!success) {
                            ns.print(`[WARN] Failed to write contract data for ${contract} on ${server} to port 2.`);
                        } else {
                            ns.print(`[DEBUG] Successfully sent contract data: ${formattedData}`);
                        }
                    } catch (e) {
                        ns.print(`[ERROR] Failed to format or write contract data for ${contract}: ${e.message}`);
                    }
                }
            } else {
                serverStatus.hasContract = false; // Mark server as not having contracts
            }
        }

        // Write updated activeServers list back to file
        await ns.write(activeServersFile, JSON.stringify(activeServers, null, 2), "w");
    } catch (e) {
        ns.print(`[ERROR] An error occurred during contract detection: ${e.message}`);
    } finally {
        ns.rm(lockFile); // Remove lock file after completion
    }

    ns.print("[INFO] Contract detection completed.");
}
