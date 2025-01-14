// File: botnet/services/communications.js
// Description: Centralized communication service that processes messages from other services and aggregates reports.

/** @param {NS} ns **/
export async function main(ns) {
    const LOG_PATH = "/data/logs/communication_log.txt";

    // Aggregated data storage
    let serviceReports = {};
    let lastReportTime = new Date().getTime();
    const reportInterval = 15 * 60 * 1000; // 15 minutes in milliseconds

    ns.clearPort(1); // Clear the communication port to start fresh
    ns.tprint("[SUCCESS] Communications service started.");

    while (true) {
        const message = ns.readPort(1);
        if (message !== "NULL PORT DATA") {
            // Parse the message and update service reports
            const [level, ...content] = message.split(" ");
            const serviceMessage = content.join(" ");

            // Log messages by type
            if (!serviceReports[level]) {
                serviceReports[level] = [];
            }
            serviceReports[level].push(serviceMessage);

            // Print to terminal if needed
            if (["[ERROR]", "[SUCCESS]", "[WARN]"].includes(level)) {
                ns.tprint(`${level} ${serviceMessage}`);
            }

            // Write to log
            await ns.write(LOG_PATH, `${new Date().toLocaleTimeString()} ${level} ${serviceMessage}\n`, "a");
        }

        // Generate a summary report every 15 minutes
        const currentTime = new Date().getTime();
        if (currentTime - lastReportTime >= reportInterval) {
            await generateSummaryReport(ns, serviceReports);
            lastReportTime = currentTime;
            serviceReports = {}; // Clear reports after summary
        }

        await ns.sleep(100); // Small delay to prevent CPU overload
    }
}

async function generateSummaryReport(ns, reports) {
    const time = new Date().toLocaleTimeString();
    let summary = `[INFO] Summary Report at ${time}:\n`;

    const levels = ["[INFO]", "[SUCCESS]", "[WARN]", "[ERROR]"];
    for (const level of levels) {
        if (reports[level] && reports[level].length > 0) {
            summary += `${level} (${reports[level].length} messages):\n`;
            for (const message of reports[level]) {
                summary += `  - ${message}\n`;
            }
        }
    }

    ns.tprint(summary);
    await ns.write("/data/logs/summary_reports.txt", summary + "\n", "a");
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\n\n# System Run Variables\nportAssignments={}`;
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
