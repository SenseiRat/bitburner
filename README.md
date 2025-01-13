# To do List
1. Log aggregation
2. Verbosity levels
3. better memory management
4. worker thread management
5. target selection upgrades
6. change home server ram report to show how much is allocated to workers
7. solve more contract types
8. stock market script
9. better C2C implementation
10. better resiliency

# Application Run Phases
## Bootstrap Phase
1. Runs Command.js
2. Reads data/config.txt to see what variables are previously set and what services are enabled
3. Checks to ensure file/directory structure exists
## Communication Phase
1. Set up communication channels to send information to print (communication) and tprint
2. Configure verbosity levels
3. Rotate logs (keep last 3 runs)
## System Phase
1. Allocate buffer RAM
2. Log RAM for Command.JS, Communications.js, set up RAM allocations for enabled plugins
3. Start up error recovery module
4. Test error recovery module
5. Allocate and record ports
## Operations Phase





1. Command.js starts up
  a. Reads data/config.txt to see what variables are set
  b. Begins serviceLogging.js
