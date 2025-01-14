# To do List
1. Verbosity levels
2. worker thread management
3. target selection upgrades
4. change home server ram report to show how much is allocated to workers
5. solve more contract types
6. stock market script
7. better C2C implementation
8. better resiliency

# Directory Structure
scripts/
- contracts/
- services/
data/
- logs/
- workerRam.txt
- config.txt
- activeServers.txt
- contracts.txt
- homeResources.txt

# Operators
## Command.js
### Bootstrap Phase
1. Runs Command.js
2. Reads data/config.txt to see what variables are previously set and what services are enabled
3. Checks to ensure file/directory structure exists
### System Phase
1. Check services
2. Allocate buffer RAM
3. Log RAM for Command.JS, Communications.js, set up RAM allocations for enabled plugins
4. Allocate and record ports
5. Start up services (reads services directory)
### Operations Phase
1. Begin loop until shutdown detected
2. Check in with running services
3. Check home RAM allocation and update homeResources.txt
4. Send report to Communications.js
5. Garbage Collection
   1. Check to start or stop any added/removed services
   2. Clean up any old processes
6. Send signals to running processes

# Services
1. --contractSolver
2. --hacknetManager
3. --upgradeManager (buys computer upgrades)
4. --programManager (buys programs)
5. --compromiseDevices
6. --purchaseServers
7. --incomeInformation
8. --experienceInformation
9. --ramInformation
10. stockManager
11. --augmentationInformation
12. --factionInformation
        -income
        -optimal factions to work on
13. --Communications.js
    1. Set up communication channels to send information to print (communication) and tprint            Communications.js
    2. Configure verbosity levels                                                                       Communications.js
    3. Rotate logs (keep last 3 runs)                                                                   Communications.js
14. --Control.js
    1. Deploy worker.js to any target that doesn't have it                                              Control.js
    2. Check home thread distribution and restart worker.js                                             Control.js
    3. Calculate the optimal distribution of threads per target per command                             Control.js
    4. Transmit commands                                                                                Control.js

# Other
Worker.js







limit worker.js to 128-200 threads per process to avoid bottlenecks and RAM waste