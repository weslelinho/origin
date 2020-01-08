import { scripts, ConfigManager } from '@openzeppelin/cli';
import { Contract } from '@openzeppelin/upgrades';

export async function migrateUserRegistryContracts(
    networkName: string,
    deployAccount: string
): Promise<Contract> {
    const { network, txParams } = await ConfigManager.initNetworkConfiguration({
        network: networkName,
        from: deployAccount
    });
    const contractName = 'UserLogic';

    scripts.add({
        contractsData: [
            {
                name: contractName,
                alias: contractName
            }
        ]
    });

    await scripts.push({ network, txParams });
    return scripts.create({
        contractAlias: contractName,
        methodName: 'initialize',
        methodArgs: [],
        network,
        txParams
    });
}
