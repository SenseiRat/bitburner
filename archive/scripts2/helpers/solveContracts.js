/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const autoSolveEnabled = ns.args[0] || false; // Flag to enable auto-solving

    ns.tprint("[INFO] Contract-solving plugin loaded. Waiting for contract detections...");

    while (true) {
        const contractInfo = ns.readPort(2).trim(); // Port 2 for contract notifications from contractDetection.js

        if (contractInfo) {
            const [server, contract] = contractInfo.split(",");
            const contractType = ns.codingcontract.getContractType(contract, server);
            const contractDesc = ns.codingcontract.getDescription(contract, server);
            const contractData = ns.codingcontract.getData(contract, server);

            ns.tprint(`[INFO] New contract detected on ${server}: ${contract} (${contractType}) - ${contractDesc}`);

            if (autoSolveEnabled) {
                const solution = solveContract(contractType, contractData);

                if (solution !== null) {
                    const result = ns.codingcontract.attempt(solution, contract, server, { returnReward: true });
                    if (result) {
                        ns.tprint(`[SUCCESS] Solved contract ${contract} on ${server}: ${result}`);
                    } else {
                        ns.tprint(`[FAIL] Failed to solve contract ${contract} on ${server}`);
                    }
                } else {
                    ns.tprint(`[WARN] No solver available for contract type ${contractType}. Presenting to the user.`);
                    ns.tprint(`[INFO] Please attempt to solve the contract manually at ${server} for: ${contractDesc}`);
                }
            } else {
                ns.tprint(`[INFO] Auto-solve disabled. Please solve the contract manually at ${server}`);
            }
        }

        await ns.sleep(2000); // Check for new contracts every 2 seconds
    }
}

/**
 * Solver function for various contract types.
 * @param {string} type - Contract type.
 * @param {any} data - Contract input data.
 * @returns {any} Solution to the contract or null if unsupported.
 */
function solveContract(type, data) {
    switch (type) {
        case "Find Largest Prime Factor":
            return largestPrimeFactor(data);
        case "Subarray with Maximum Sum":
            return maxSubarraySum(data);
        case "Total Ways to Sum":
            return totalWaysToSum(data);
        case "Unique Paths in a Grid I":
            return uniquePathsI(data);
        case "Unique Paths in a Grid II":
            return uniquePathsII(data);
        default:
            return null; // Placeholder for unsupported contracts
    }
}

/** Example solvers */
function largestPrimeFactor(n) {
    let factor = 2;
    while (n > 1) {
        if (n % factor === 0) {
            n /= factor;
        } else {
            factor++;
        }
    }
    return factor;
}

function maxSubarraySum(arr) {
    let maxSum = arr[0], currentSum = arr[0];
    for (let i = 1; i < arr.length; i++) {
        currentSum = Math.max(arr[i], currentSum + arr[i]);
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
}

function totalWaysToSum(n) {
    const dp = new Array(n + 1).fill(0);
    dp[0] = 1;
    for (let i = 1; i < n; i++) {
        for (let j = i; j <= n; j++) {
            dp[j] += dp[j - i];
        }
    }
    return dp[n];
}

function uniquePathsI([m, n]) {
    const dp = Array.from({ length: m }, () => new Array(n).fill(1));
    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        }
    }
    return dp[m - 1][n - 1];
}

function uniquePathsII(grid) {
    const m = grid.length;
    const n = grid[0].length;
    const dp = Array.from({ length: m }, () => new Array(n).fill(0));
    dp[0][0] = grid[0][0] === 0 ? 1 : 0;

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (grid[i][j] === 1) continue; // Obstacle
            if (i > 0) dp[i][j] += dp[i - 1][j];
            if (j > 0) dp[i][j] += dp[i][j - 1];
        }
    }
    return dp[m - 1][n - 1];
}
