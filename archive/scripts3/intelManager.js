// /scripts3/intelManager.js
// Description: Logs hacking experience and money per second, and periodically recommends optimal augmentations and factions.
// Parameters: None.

/** GLOBAL VARIABLES */
const REPORT_INTERVAL = 900000; // 15 minutes for full report (in milliseconds).
const POLL_INTERVAL = 5000; // 5 seconds for experience and money per second logging.

let lastReportTime = 0;

/**
 * Formats large numbers with commas and two decimal places.
 * @param {number} num - The number to format.
 * @returns {string} Formatted number.
 */
function formatNumber(num) {
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Logs hacking experience and money per second.
 */
function logStats(ns) {
    const player = ns.getPlayer();
    const hackingExpGainRate = ns.getTotalScriptExpGain(); // Experience per second from scripts.
    const moneyGainRate = ns.getTotalScriptIncome()[0]; // Money per second from scripts.

    ns.print(`[INFO] Hacking Exp/s: ${formatNumber(hackingExpGainRate)} | Money/s: $${formatNumber(moneyGainRate)}`);
}

/**
 * Logs recommendations for augmentations and factions.
 */
function logRecommendations(ns) {
    ns.print("[INFO] Gathering augmentation and faction recommendations...");

    const factions = ns.getPlayer().factions;
    let bestAugmentation = { name: "", price: Infinity, faction: "" };
/*
    for (const faction of factions) {
        const augments = ns.singularity.getAugmentationsFromFaction(faction).filter(augment => !ns.singularity.getOwnedAugmentations(true).includes(augment));
        for (const augment of augments) {
            const price = ns.singularity.getAugmentationPrice(augment);
            if (price < bestAugmentation.price) {
                bestAugmentation = { name: augment, price, faction };
            }
        }
    }
*/
    if (bestAugmentation.name) {
        ns.print(`[RECOMMENDATION] Best Augment to Save For: ${bestAugmentation.name} from ${bestAugmentation.faction} at $${formatNumber(bestAugmentation.price)}.`);
    } else {
        ns.print("[INFO] No new augmentations available to recommend.");
    }
}

/**
 * Main function: Logs stats and provides periodic recommendations.
 * @param {NS} ns - Bitburner namespace.
 */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("[INFO] Starting intelManager.js...");

    while (true) {
        const currentTime = Date.now();

        // Log stats every POLL_INTERVAL
        logStats(ns);

        // Log recommendations every REPORT_INTERVAL
        if (currentTime - lastReportTime >= REPORT_INTERVAL) {
            logRecommendations(ns);
            lastReportTime = currentTime;
        }

        await ns.sleep(POLL_INTERVAL);
    }
}
