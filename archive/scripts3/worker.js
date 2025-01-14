// /scripts3/worker.js
// Description: General-purpose script for grow, weaken, and hack operations based on dynamic instructions or CLI inputs.

const COMM_PORT = 1; // Listening port for control.js instructions.

/**
 * Main function: Executes grow, weaken, or hack based on input or port instructions.
 * @param {NS} ns - Bitburner namespace.
 */
export async function main(ns) {
    ns.disableLog("ALL");
    let target = "n00dles"; // Default target.
    let action = "grow";   // Default action.

    if (ns.args.length >= 2) {
        // CLI-mode
        target = ns.args[0];
        action = ns.args[1];
        ns.print(`[INFO] Running in CLI mode: target=${target}, action=${action}`);

        // Perform one round of the specified action.
        try {
            await performAction(ns, target, action);
        } catch (err) {
            ns.print(`[ERROR] CLI mode: ${action} on ${target} failed: ${err.message}`);
        }
        return;
    }

    ns.print("[INFO] Running in service mode, listening on port 1...");

    while (true) {
        const data = ns.readPort(COMM_PORT);
        if (data === "NULL PORT DATA") {
            await ns.sleep(1000); // No data yet; wait before re-checking.
            continue;
        }

        try {
            const { target: newTarget, action: newAction } = JSON.parse(data);
            if (!newTarget || !newAction) {
                throw new Error("Invalid JSON structure");
            }

            // Log changes to prevent running stale data.
            if (target !== newTarget || action !== newAction) {
                ns.print(`[INFO] Updated instructions: target=${newTarget}, action=${newAction}`);
            }

            target = newTarget;
            action = newAction;

            // Perform one round of the specified action.
            await performAction(ns, target, action);
        } catch (err) {
            ns.print(`[ERROR] Failed to parse instructions or perform action: ${err.message}`);
        }
    }
}

/**
 * Executes the specified action on the target server.
 * @param {NS} ns - Bitburner namespace.
 * @param {string} target - The target server to act upon.
 * @param {string} action - The action to perform: grow, weaken, or hack.
 */
async function performAction(ns, target, action) {
    try {
        switch (action) {
            case "grow":
                await ns.grow(target);
                break;
            case "weaken":
                await ns.weaken(target);
                break;
            case "hack":
                await ns.hack(target);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        ns.print(`[INFO] Completed ${action} on ${target}.`);
    } catch (err) {
        ns.print(`[ERROR] ${action} on ${target} failed: ${err.message}`);
    }
}
