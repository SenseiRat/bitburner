// File: botnet/scripts/worker.js
// Description: Worker script that listens for commands from control.js and enforces a maximum of 128 threads.

/** @param {NS} ns **/
export async function main(ns) {
    const MAX_THREADS = 128;
    const COMMAND_PORT = ns.args[0] || 1; // Port from which the worker receives instructions

    if (ns.getRunningScript().threads > MAX_THREADS) {
        ns.tprint(`[ERROR] worker.js started with ${ns.getRunningScript().threads} threads, exceeding the maximum limit of ${MAX_THREADS} threads.`);
        return;
    }

    ns.tprint(`[SUCCESS] Worker script started on port ${COMMAND_PORT} with ${ns.getRunningScript().threads} threads.`);

    while (true) {
        const commandMessage = ns.readPort(COMMAND_PORT);
        if (commandMessage !== "NULL PORT DATA") {
            const [command, target] = commandMessage.split(" ");

            if (!target) {
                ns.tprint(`[ERROR] Invalid command format: ${commandMessage}`);
                continue;
            }

            switch (command.toLowerCase()) {
                case "grow":
                    await ns.grow(target);
                    ns.tprint(`[INFO] grow() executed against ${target}.`);
                    break;
                case "weaken":
                    await ns.weaken(target);
                    ns.tprint(`[INFO] weaken() executed against ${target}.`);
                    break;
                case "hack":
                    await ns.hack(target);
                    ns.tprint(`[INFO] hack() executed against ${target}.`);
                    break;
                default:
                    ns.tprint(`[WARN] Unknown command: ${command}`);
                    break;
            }
        }

        await ns.sleep(500); // Poll the port every 500ms for new commands
    }
}
