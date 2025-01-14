// /scripts3/contractSolver.js
// Description: Persistent service that scans for contracts and applies the correct solver dynamically.

const CONTRACTS_DIR = "/scripts3/contracts/";
const CHECK_INTERVAL = 60000; // 1 minute interval for contract scanning.
const EXCLUDED_PREFIX = "-"; // Files with this prefix will be ignored.

/**
 * Main persistent function: Continuously scans for contracts and solves them using available solvers.
 * @param {NS} ns - Bitburner namespace.
 */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("[INFO] Starting contractSolver.js as a persistent service...");

    const solvers = await loadSolvers(ns);

    while (true) {
        const servers = scanAllServers(ns);
        let contractsFound = 0;

        for (const server of servers) {
            const contracts = ns.ls(server, ".cct");

            for (const contract of contracts) {
                const contractType = ns.codingcontract.getContractType(contract, server);

                if (solvers[contractType]) {
                    contractsFound++;
                    try {
                        await solveContract(ns, server, contract, contractType, solvers[contractType]);
                    } catch (err) {
                        ns.print(`[ERROR] Failed to solve contract ${contract} on ${server}: ${err.message}`);
                    }
                } else {
                    ns.print(`[WARN] No solver available for ${contractType} on ${server}`);
                }
            }
        }

        ns.print(`[INFO] Completed contract scan. Total contracts processed: ${contractsFound}.`);
        await ns.sleep(CHECK_INTERVAL);
    }
}

/**
 * Loads contract solvers from the specified directory.
 * @param {NS} ns - Bitburner namespace.
 * @returns {Promise<Object>} - A dictionary mapping contract types to solver functions.
 */
async function loadSolvers(ns) {
    const solvers = {};
    const files = ns.ls("home", CONTRACTS_DIR).filter(f => f.endsWith(".js") && !f.startsWith(CONTRACTS_DIR + EXCLUDED_PREFIX));

    for (const file of files) {
        const fullPath = CONTRACTS_DIR + file;
        try {
            const module = await import(fullPath + "?t=" + Date.now());
            if (module.solve && module.CONTRACT_TYPE) {
                solvers[module.CONTRACT_TYPE] = module.solve;
                ns.print(`[INFO] Loaded solver for ${module.CONTRACT_TYPE} from ${file}`);
            } else {
                ns.print(`[WARN] ${file} does not export CONTRACT_TYPE or solve function.`);
            }
        } catch (err) {
            ns.print(`[ERROR] Failed to load ${file}: ${err.message}`);
        }
    }

    return solvers;
}

/**
 * Scans all servers recursively and returns a list of server names.
 * @param {NS} ns - Bitburner namespace.
 * @returns {string[]} - Array of server names.
 */
function scanAllServers(ns) {
    const visited = new Set();
    const stack = ["home"];

    while (stack.length > 0) {
        const current = stack.pop();

        if (!visited.has(current)) {
            visited.add(current);
            const neighbors = ns.scan(current).filter(server => !visited.has(server));
            stack.push(...neighbors);
        }
    }

    return [...visited];
}

/**
 * Solves a contract using the appropriate solver.
 * @param {NS} ns - Bitburner namespace.
 * @param {string} server - Server hosting the contract.
 * @param {string} contract - Contract filename.
 * @param {string} contractType - Contract type.
 * @param {Function} solver - Solver function for the contract type.
 */
async function solveContract(ns, server, contract, contractType, solver) {
    const data = ns.codingcontract.getData(contract, server);
    const result = solver(data);

    const success = ns.codingcontract.attempt(result, contract, server);
    if (success) {
        ns.tprint(`[SUCCESS] Solved ${contractType} on ${server}`);
    } else {
        ns.print(`[FAILURE] Failed to solve ${contractType} on ${server}`);
    }
}
