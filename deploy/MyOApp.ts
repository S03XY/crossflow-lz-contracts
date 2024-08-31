import assert from 'assert'
import { ethers } from 'hardhat'

import { type DeployFunction } from 'hardhat-deploy/types'

// TODO declare your contract name here
const contractName = 'Register'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // }
    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    console.log('endpointV2Deployment', endpointV2Deployment.address)
    console.log('deployer', deployer)

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [deploy, 0, 0],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy
