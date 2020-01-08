const { migrateUserRegistryContracts } = require('../dist/js/src/utils/migrateContracts');

module.exports = (deployer, networkName, accounts) => {
    deployer.then(async () => {
        const contract = await migrateUserRegistryContracts(networkName, accounts[0]);
        console.log(`Deployed UserLogic to address ${contract.address}.`);
    })
}