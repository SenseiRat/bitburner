/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    ns.tprint("[INFO] Starting Home Server management...");

    const homeServer = "home";
    const homeMaxRam = ns.getServerMaxRam(homeServer);
    const ramBuffer = 32; // Keep some RAM available for manual tasks

    while (true) {
        const freeRam = ns.getServerMaxRam(homeServer) - ns.getServerUsedRam(homeServer) - ramBuffer;

        if (freeRam <= 0) {
            ns.print("[WARN] Insufficient free RAM on home for batch operations.");
            await ns.sleep(5000);
            continue;
        }

        // Read the current target information from port 1
        let targetData = ns.readPort(1);
        let targets = { grow: "", hack: "", weaken: "" };

        try {
            targets = JSON.parse(targetData);
            if (!targets.grow || !targets.hack || !targets.weaken) {
                ns.print("[WARN] No valid targets found. Defaulting to 'joesguns'.");
                targets = { grow: "joesguns", hack: "joesguns", weaken: "joesguns" };
            }
        } catch {
            ns.print("[ERROR] Failed to parse target data. Using fallback targets.");
            targets = { grow: "joesguns", hack: "joesguns", weaken: "joesguns" };
        }

        // RAM requirements for batch scripts
        const growRam = ns.getScriptRam("batch/grow.js");
        const hackRam = ns.getScriptRam("batch/hack.js");
        const weakenRam = ns.getScriptRam("batch/weaken.js");

        // Calculate available threads
        const growThreads = Math.floor(freeRam / (growRam * 3));
        const hackThreads = Math.floor(freeRam / (hackRam * 3));
        const weakenThreads = Math.floor(freeRam / (weakenRam * 3));

        // Perform operations if there is enough free RAM
        if (growThreads > 0) {
            ns.exec("batch/grow.js", homeServer, growThreads, targets.grow);
            ns.print(`[INFO] Home growing ${targets.grow} with ${growThreads} threads.`);
        }

        if (hackThreads > 0) {
            ns.exec("batch/hack.js", homeServer, hackThreads, targets.hack);
            ns.print(`[INFO] Home hacking ${targets.hack} with ${hackThreads} threads.`);
        }

        if (weakenThreads > 0) {
            ns.exec("batch/weaken.js", homeServer, weakenThreads, targets.weaken);
            ns.print(`[INFO] Home weakening ${targets.weaken} with ${weakenThreads} threads.`);
        }

        // Log summary
        ns.print(`[INFO] Home Server management cycle completed. Free RAM left: ${freeRam.toFixed(2)} GB.`);

        await ns.sleep(10000); // Check every 10 seconds for batch management
    }
}
