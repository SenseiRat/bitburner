/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0]; // Access the target from script arguments
    const moneyThresh = ns.getServerMaxMoney(target) * 0.75; // Set money threshold to 75% of max money
    const securityThresh = ns.getServerMinSecurityLevel(target) + 5; // Set security threshold slightly above min security

    while (true) {
        if (ns.getServerSecurityLevel(target) > securityThresh) {
            // If the server's security level is above the threshold, weaken it
            await ns.weaken(target);
        } else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
            // If the server's money is below the threshold, grow it
            await ns.grow(target);
        } else {
            // Otherwise, hack it
            await ns.hack(target);
        }
    }
}
