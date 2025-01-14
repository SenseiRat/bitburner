/** @param {NS} ns **/
export async function main(ns) {
    const servers = [
      { name: "aerocorp", skill: 860, ports: 5, ram: 0.00 },
      { name: "aevum-police", skill: 415, ports: 4, ram: 16.00 },
      { name: "alpha-ent", skill: 552, ports: 4, ram: 32.00 },
      { name: "applied-energetics", skill: 806, ports: 4, ram: 0.00 },
      { name: "avmnite-02h", skill: 204, ports: 2, ram: 32.00 },
      { name: "b-and-a", skill: 930, ports: 5, ram: 0.00 },
      { name: "blade", skill: 932, ports: 5, ram: 64.00 },
      { name: "catalyst", skill: 421, ports: 3, ram: 64.00 },
      { name: "clarkinc", skill: 1155, ports: 5, ram: 0.00 },
      { name: "computek", skill: 376, ports: 3, ram: 0.00 },
      { name: "crush-fitness", skill: 240, ports: 2, ram: 0.00 },
      { name: "CSEC", skill: 53, ports: 1, ram: 8.00 },
      { name: "darkweb", skill: 1, ports: 5, ram: 0.00 },
      { name: "defcomm", skill: 1009, ports: 5, ram: 0.00 },
      { name: "deltaone", skill: 851, ports: 5, ram: 0.00 },
      { name: "foodnstuff", skill: 1, ports: 0, ram: 16.00 },
      { name: "fulcrumtech", skill: 1018, ports: 5, ram: 1028.00 },
      { name: "galactic-cyber", skill: 862, ports: 5, ram: 0.00 },
      { name: "global-pharm", skill: 822, ports: 4, ram: 16.00 },
      { name: "harakiri-sushi", skill: 40, ports: 0, ram: 16.00 },
      { name: "helios", skill: 805, ports: 5, ram: 128.00 },
      { name: "home", skill: 1, ports: 5, ram: 128.00 },
      { name: "hong-fang-tea", skill: 30, ports: 0, ram: 16.00 },
      { name: "I.I.I.I", skill: 352, ports: 3, ram: 16.00 },
      { name: "icarus", skill: 898, ports: 5, ram: 0.00 },
      { name: "infocomm", skill: 910, ports: 5, ram: 0.00 },
      { name: "iron-gym", skill: 100, ports: 1, ram: 32.00 },
      { name: "joesguns", skill: 10, ports: 0, ram: 16.00 },
      { name: "johnson-ortho", skill: 261, ports: 2, ram: 0.00 },
      { name: "kuai-gong", skill: 1216, ports: 5, ram: 0.00 },
      { name: "lexo-corp", skill: 729, ports: 4, ram: 64.00 },
      { name: "max-hardware", skill: 80, ports: 1, ram: 32.00 },
      { name: "microdyne", skill: 850, ports: 5, ram: 16.00 },
      { name: "millenium-fitness", skill: 487, ports: 3, ram: 256.00 },
      { name: "n00dles", skill: 1, ports: 0, ram: 4.00 },
      { name: "nectar-net", skill: 20, ports: 0, ram: 16.00 },
      { name: "neo-net", skill: 50, ports: 1, ram: 32.00 },
      { name: "netlink", skill: 390, ports: 3, ram: 128.00 },
      { name: "nova-med", skill: 827, ports: 4, ram: 0.00 },
      { name: "nwo", skill: 1008, ports: 5, ram: 0.00 },
      { name: "omega-net", skill: 180, ports: 2, ram: 32.00 },
      { name: "omnia", skill: 889, ports: 5, ram: 64.00 },
      { name: "omnitek", skill: 954, ports: 5, ram: 512.00 },
      { name: "phantasy", skill: 100, ports: 2, ram: 32.00 },
      { name: "powerhouse-fitness", skill: 1006, ports: 5, ram: 32.00 },
      { name: "rho-construction", skill: 508, ports: 3, ram: 32.00 },
      { name: "rothman-uni", skill: 424, ports: 3, ram: 128.00 },
      { name: "run4theh111z", skill: 526, ports: 4, ram: 256.00 },
      { name: "sigma-cosmetics", skill: 5, ports: 0, ram: 16.00 },
      { name: "sigma", skill: 1111, ports: 5, ram: 0.00 },
      { name: "silver-helix", skill: 150, ports: 2, ram: 64.00 },
      { name: "snap-fitness", skill: 768, ports: 4, ram: 0.00 },
      { name: "solaris", skill: 777, ports: 5, ram: 16.00 },
      { name: "stormtech", skill: 968, ports: 5, ram: 0.00 },
      { name: "summit-uni", skill: 430, ports: 3, ram: 64.00 },
      { name: "syscore", skill: 597, ports: 4, ram: 0.00 },
      { name: "taiyang-digital", skill: 898, ports: 5, ram: 0.00 },
      { name: "the-hub", skill: 298, ports: 2, ram: 32.00 },
      { name: "titan-labs", skill: 874, ports: 5, ram: 64.00 },
      { name: "unitalife", skill: 776, ports: 4, ram: 16.00 },
      { name: "univ-energy", skill: 857, ports: 4, ram: 32.00 },
      { name: "vitalife", skill: 891, ports: 5, ram: 128.00 },
      { name: "zb-def", skill: 822, ports: 4, ram: 0.00 },
      { name: "zb-institute", skill: 733, ports: 5, ram: 128.00 },
      { name: "zer0", skill: 75, ports: 1, ram: 32.00 },
      { name: "zeus-med", skill: 827, ports: 5, ram: 0.00 },
      { name: ".", skill: 546, ports: 4, ram: 16.00 }
    ];
  
    const hackLevel = ns.getHackingLevel();
    let targetServer = "";
    let maxMoney = 0; // Track the highest money for selection
  
    for (const server of servers) {
      // Ensure the server's skill requirement is within 1/3 of the hackLevel and it has money
      if (server.skill <= hackLevel / 3) {
        const serverMaxMoney = ns.getServerMaxMoney(server.name);
  
        if (serverMaxMoney > maxMoney) {
            maxMoney = serverMaxMoney;
            targetServer = server.name; // Set the server with the highest max money
        }
      }
    }
  
    if (!targetServer) {
        ns.tprint("No valid target server found! Defaulting to 'joesguns'");
        targetServer = "joesguns"; // Fallback if no optimal server is found
    }
  
    ns.tprint(`Target Server set to: ${targetServer}`);
  
    for (const server of servers) {
      if (hackLevel < server.skill) {
        ns.tprint(`Skipping ${server.name}: Hack level of ${hackLevel} is too low for server (${server.skill})`)
        continue;
      }
  
      await ns.scp("money.js", server.name);
  
      if (server.ports <= 5 && ns.fileExists("SQLInject.exe")) {
        ns.sqlinject(server.name);
        ns.sqlinject(targetServer);
      }
      if (server.ports <= 4 && ns.fileExists("HTTPWorm.exe")) {
        ns.httpworm(server.name);
        ns.httpworm(targetServer);
      }
      if (server.ports <= 3 && ns.fileExists("relaySMTP.exe")) {
        ns.relaysmtp(server.name);
        ns.relaysmtp(targetServer);
      }
      if (server.ports <= 2 && ns.fileExists("FTPCrack.exe")) {
        ns.ftpcrack(server.name);
        ns.ftpcrack(targetServer);
      }
      if (server.ports <= 1 && ns.fileExists("BruteSSH.exe")) {
        ns.brutessh(server.name);
        ns.brutessh(targetServer);
      }
  
      ns.tprint("Nuking: " + server.name)
      ns.nuke(server.name);
      ns.nuke(targetServer);
  
      ns.killall(server.name)
  
      const threads = Math.floor(ns.getServerMaxRam(server.name) / ns.getScriptRam("money.js"));
      if (threads > 0) {
        ns.exec("money.js", server.name, threads, targetServer);
      }
  
      //if (hackLevel >= server.skill) {
      //    await ns.installBackdoor(server.name);
      //}
    }
  }