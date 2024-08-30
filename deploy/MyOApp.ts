import assert from 'assert'
import { ethers } from 'hardhat'

import { type DeployFunction } from 'hardhat-deploy/types'

// TODO declare your contract name here
const contractName = 'USDC'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // This is an external deployment pulled in from @layerzerolabs/lz-evm-sdk-v2
    //
    // @layerzerolabs/toolbox-hardhat takes care of plugging in the external deployments
    // from @layerzerolabs packages based on the configuration in your hardhat config
    //
    // For this to work correctly, your network config must define an eid property
    // set to `EndpointId` as defined in @layerzerolabs/lz-definitions
    //
    // For example:
    //
    // networks: {
    //   fuji: {
    //     ...
    //     eid: EndpointId.AVALANCHE_V2_TESTNET
    //   }
    // }
    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    console.log('endpointV2Deployment', endpointV2Deployment.address)
    console.log('deployer', deployer)

    const { address } = await deploy(contractName, {
        from: deployer,
        args: ['USD Coin', 'USDC', '0xbD672D1562Dd32C23B563C989d8140122483631d', deployer],
        log: true,
        skipIfAlreadyDeployed: false,
        gasPrice: ethers.utils.parseUnits('3000',"gwei"), // Specify gas price
        gasLimit: 6000000, // Specify gas limit
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy
