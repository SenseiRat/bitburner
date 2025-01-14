// File: botnet/services/contractSolver.js
// Description: Service to find and solve coding contracts. Logs contract details and attempts to solve using available scripts.

/** @param {NS} ns **/
export async function main(ns) {
    const CONTRACTS_PATH = "/data/contracts.txt";
    const CONFIG_PATH = "/data/config.txt";
    const CONTRACT_SCRIPTS_DIR = "/botnet/contracts/";

    // Read configuration
    let config = await readConfigFile(ns, CONFIG_PATH);
    const portAssignments = JSON.parse(config["portAssignments"] || "{}");
    const commPort = portAssignments.communication ? portAssignments.communication[0] : 1;
    const contractMinTries = parseInt(config["contractMinTries"] || "3", 10);

    async function sendToCommunications(level, message) {
        const formattedMessage = `[${level}] ${message}`;
        await ns.writePort(commPort, formattedMessage);
    }

    async function logContract(contractDetails) {
        let contractsLog = {};
        if (ns.fileExists(CONTRACTS_PATH)) {
            contractsLog = JSON.parse(await ns.read(CONTRACTS_PATH) || "{}");
        }
        contractsLog[`${contractDetails.server}:${contractDetails.filename}`] = contractDetails;
        await ns.write(CONTRACTS_PATH, JSON.stringify(contractsLog, null, 2), "w");
    }

    await sendToCommunications("INFO", "Contract Solver service started.");

    let solvedContracts = 0;

    while (true) {
        const servers = ns.scan("home").concat(ns.scan().filter(host => host !== "home"));
        let unsolvedContracts = 0;
        let contractTypes = {};

        for (const server of servers) {
            const files = ns.ls(server).filter(file => file.endsWith(".cct"));
            for (const file of files) {
                const contractType = ns.getContractType(file, server);
                const triesLeft = ns.getNumTriesRemaining(file, server);

                const contractDetails = {
                    filename: file,
                    server: server,
                    type: contractType,
                    triesLeft: triesLeft
                };

                await logContract(contractDetails);

                if (triesLeft <= contractMinTries) {
                    await sendToCommunications("WARN", `Skipping contract ${file} on ${server} (only ${triesLeft} tries left).`);
                    continue;
                }

                const solverScript = `${CONTRACT_SCRIPTS_DIR}${contractType}.js`;

                if (ns.fileExists(solverScript, "home")) {
                    try {
                        const success = await ns.run(solverScript, 1, server, file);
                        if (success) {
                            const reward = ns.getContractReward(file, server);
                            solvedContracts++;
                            await sendToCommunications("SUCCESS", `Solved contract ${file} on ${server}. Reward: ${reward}.`);
                            ns.tprint(`[SUCCESS] Solved contract ${file} on ${server} for reward: ${reward}.`);
                        } else {
                            await sendToCommunications("ERROR", `Failed to solve contract ${file} on ${server}. Check solver script.`);
                        }
                    } catch (err) {
                        await sendToCommunications("ERROR", `Error solving contract ${file} on ${server}: ${err.message}`);
                    }
                } else {
                    await sendToCommunications("WARN", `No solver script found for contract type: ${contractType}.`);
                    unsolvedContracts++;
                    contractTypes[contractType] = (contractTypes[contractType] || 0) + 1;
                }
            }
        }

        const mostCommonType = Object.entries(contractTypes).sort((a, b) => b[1] - a[1])[0];
        const optimalSolver = mostCommonType ? mostCommonType[0] : "None";

        await sendToCommunications("INFO", `Contracts solved: ${solvedContracts}, unsolved contracts: ${unsolvedContracts}, most needed solver: ${optimalSolver}.`);
        await ns.sleep(60000); // Sleep for 1 minute before checking again.
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\ncontractSolver=ON\ncontractMinTries=3\n\n# System Run Variables\nportAssignments={}`;
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
