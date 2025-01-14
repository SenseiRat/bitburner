// File: botnet/services/augmentationManager.js
// Description: Service to suggest optimal augmentations and provide reminders when augmentations are available.

/** @param {NS} ns **/
export async function main(ns) {
    const CONFIG_PATH = "/data/config.txt";

    // Read configuration
    let config = await readConfigFile(ns, CONFIG_PATH);
    const portAssignments = JSON.parse(config["portAssignments"] || "{}");
    const commPort = portAssignments.communication ? portAssignments.communication[0] : 1;

    async function sendToCommunications(level, message) {
        const formattedMessage = `[${level}] ${message}`;
        await ns.writePort(commPort, formattedMessage);
    }

    await sendToCommunications("INFO", "Augmentation Manager service started.");

    while (true) {
        await ns.sleep(30000); // Check every 30 seconds

        const factions = ns.getPlayer().factions;
        let affordableAugmentations = [];

        for (const faction of factions) {
            const augmentations = ns.getAugmentationsFromFaction(faction).filter(aug => !ns.getOwnedAugmentations(true).includes(aug));

            for (const augmentation of augmentations) {
                const cost = ns.getAugmentationPrice(augmentation);
                const repReq = ns.getAugmentationRepReq(augmentation);
                const playerRep = ns.getFactionRep(faction);

                if (playerRep >= repReq && ns.getServerMoneyAvailable("home") >= cost) {
                    affordableAugmentations.push({ faction, augmentation, cost });
                }
            }
        }

        if (affordableAugmentations.length > 0) {
            affordableAugmentations.sort((a, b) => a.cost - b.cost);
            const bestAugmentation = affordableAugmentations[0];
            await sendToCommunications("INFO", `You can afford ${bestAugmentation.augmentation} from ${bestAugmentation.faction} for $${bestAugmentation.cost.toLocaleString()}.`);
        } else {
            await sendToCommunications("INFO", "No affordable augmentations available at the moment.");
        }

        // Suggest a strategy if funds or reputation are low
        if (affordableAugmentations.length === 0) {
            await sendToCommunications("WARN", "Consider working for factions or earning more money to afford augmentations.");
        }

        // Provide a summary of the top augmentations available
        const topAugmentations = affordableAugmentations.slice(0, 3).map(aug => `${aug.augmentation} from ${aug.faction} ($${aug.cost.toLocaleString()})`).join(", ");
        if (topAugmentations.length > 0) {
            await sendToCommunications("INFO", `Top affordable augmentations: ${topAugmentations}`);
        }
    }
}

async function readConfigFile(ns, path) {
    if (!ns.fileExists(path)) {
        ns.tprint(`[WARN] Config file not found at ${path}. Creating default.`);
        const defaultConfig = `# System Configuration\nverbosity=DEBUG\ncommunication=ON\naugmentationManager=ON\n\n# System Run Variables\nportAssignments={}`;
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
