import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'

import { Options } from '@layerzerolabs/lz-v2-utilities'
import { assert } from 'console'
import { equal } from 'assert'
import { formatEther, parseEther } from 'ethers/lib/utils'

describe('OFT testing', function () {
    // Constant representing a mock Endpoint ID for testing purposes
    const eidA = 1
    const eidB = 2
    // Declaration of variables to be used in the test suite
    let MyOApp: ContractFactory
    let EndpointV2Mock: ContractFactory
    let ownerA: SignerWithAddress
    let ownerB: SignerWithAddress
    let endpointOwner: SignerWithAddress
    let myOAppA: Contract
    let myOAppB: Contract
    let mockEndpointV2A: Contract
    let mockEndpointV2B: Contract

    let RegistrationContract: ContractFactory
    let USDCContract: ContractFactory

    let RegisterContractA: Contract
    let RegisterContractB: Contract

    let USDCContractA: Contract
    let USDCContractB: Contract

    const _domain = 'shashank'

    // Before hook for setup that runs once before all tests in the block
    before(async function () {
        // Contract factory for our tested contract
        // MyOApp = await ethers.getContractFactory('MyOApp')

        // Contract factory for our Registration contract
        RegistrationContract = await ethers.getContractFactory('Register')

        // Contract factory for our usdc  contract
        USDCContract = await ethers.getContractFactory('USDC')

        // Fetching the first three signers (accounts) from Hardhat's local Ethereum network
        const signers = await ethers.getSigners()

        ownerA = signers.at(0)!
        ownerB = signers.at(1)!
        endpointOwner = signers.at(2)!

        // The EndpointV2Mock contract comes from @layerzerolabs/test-devtools-evm-hardhat package
        // and its artifacts are connected as external artifacts to this project
        //
        // Unfortunately, hardhat itself does not yet provide a way of connecting external artifacts,
        // so we rely on hardhat-deploy to create a ContractFactory for EndpointV2Mock
        //
        // See https://github.com/NomicFoundation/hardhat/issues/1040
        const EndpointV2MockArtifact = await deployments.getArtifact('EndpointV2Mock')
        EndpointV2Mock = new ContractFactory(EndpointV2MockArtifact.abi, EndpointV2MockArtifact.bytecode, endpointOwner)
    })

    // beforeEach hook for setup that runs before each test in the block
    beforeEach(async function () {
        mockEndpointV2A = await EndpointV2Mock.connect(ownerA).deploy(eidA)
        mockEndpointV2B = await EndpointV2Mock.connect(ownerA).deploy(eidB)

        RegisterContractA = await RegistrationContract.connect(ownerA).deploy(ownerA.address, 0, 0)
        RegisterContractB = await RegistrationContract.connect(ownerA).deploy(ownerA.address, 0, 0)

        USDCContractA = await USDCContract.connect(ownerA).deploy(
            'USD Coin',
            'USDC',
            mockEndpointV2A.address,
            ownerA.address
        )
        USDCContractB = await USDCContract.connect(ownerA).deploy(
            'USD Coin',
            'USDC',
            mockEndpointV2B.address,
            ownerA.address
        )

        await mockEndpointV2A.connect(ownerA).setDestLzEndpoint(USDCContractB.address, mockEndpointV2B.address)
        await mockEndpointV2B.connect(ownerA).setDestLzEndpoint(USDCContractA.address, mockEndpointV2A.address)

        await USDCContractA.connect(ownerA).setPeer(eidB, ethers.utils.zeroPad(USDCContractB.address, 32))
        await USDCContractB.connect(ownerA).setPeer(eidA, ethers.utils.zeroPad(USDCContractA.address, 32))
    })

    // A test case to verify message sending functionality
    it('register domain in chain A for owner A', async function () {
        // ? register contract on chain B
        const tx = await RegisterContractA.connect(ownerA).makeRegisterIntent(_domain, { value: 0 })
        const response = await tx.wait()
        if (response.events[0].event === 'EventRegisterIntent') {
            const tx = await RegisterContractA.connect(ownerA).reserveDomain(ownerA.address, _domain)
            const response = await tx.wait()
        }

        const registeredDomain = await RegisterContractA.domainToAddress(_domain)
        expect(registeredDomain).eq(ownerA.address)
    })

    it('transfer some usdc to ownerB ', async function () {
        // ? fund owner B with some tokens
        let ownerABalance = await USDCContractB.connect(ownerA).balanceOf(ownerA.address)
        expect(formatEther(ownerABalance)).eq('1000.0')

        const tx = await USDCContractB.transfer(ownerB.address, parseEther('100'))
        await tx.wait()

        ownerABalance = await USDCContractB.connect(ownerA).balanceOf(ownerA.address)
        expect(formatEther(ownerABalance)).eq('900.0')

        let ownerBBalance = await USDCContractB.connect(ownerA).balanceOf(ownerB.address)
        expect(formatEther(ownerBBalance)).eq('100.0')
    })

    it('transfer usdc token from chain B to chain A using domain', async function () {
        // ? register

        const tx = await RegisterContractA.connect(ownerA).makeRegisterIntent(_domain, { value: 0 })
        const response = await tx.wait()
        if (response.events[0].event === 'EventRegisterIntent') {
            const tx = await RegisterContractA.connect(ownerA).reserveDomain(ownerA.address, _domain)
            const response = await tx.wait()
        }

        // ? fund owner B with some tokens
        const transferTx = await USDCContractB.connect(ownerA).transfer(ownerB.address, parseEther('100'))
        await transferTx.wait()

        let ownerBBalance = await USDCContractB.connect(ownerB).balanceOf(ownerB.address)
        expect(formatEther(ownerBBalance)).eq('100.0')

        //  ? invoke transfer intent on chain B to chain A
        const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()

        const transferIntentTx = await USDCContractB.transferIntent(_domain, parseEther('1'), eidA, {
            value: parseEther('1'),
        })
        const transferIntentResponse = await transferIntentTx.wait()

        if (transferIntentResponse.events[0]) {
            const event = transferIntentResponse.events[0]
            // console.log('event name', event.event)

            if (event.event === 'EventTransferIntent') {
                const tokensToSend = ethers.utils.parseEther('1')

                // Defining extra message execution options for the send operation
                const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()

                const convertedFromDomain = ethers.utils.formatBytes32String('owner b')
                const convertedToDomain = ethers.utils.formatBytes32String('owner a')

                // address, fromDomain, toDomain

                const encodedData = ethers.utils.defaultAbiCoder.encode(
                    ['address', 'bytes32', 'bytes32'],
                    [ownerB.address, convertedFromDomain, convertedToDomain]
                )

                const sendParam = [
                    eidA,
                    ethers.utils.zeroPad(ownerA.address, 32),
                    tokensToSend,
                    tokensToSend,
                    options,
                    encodedData,
                    '0x',
                ]

                // Fetching the native fee for the token send operation
                const [nativeFee] = await USDCContractB.connect(ownerB).quoteSend(sendParam, false)
                const transferTx = await USDCContractB.send(sendParam, [nativeFee, 0], ownerB.address, {
                    value: nativeFee,
                })

                const transferTxResponse = await transferTx.wait()
                console.log('transferTxResponse', transferTxResponse.events)

                const event = transferTxResponse.events.find((event: any) => event.event === 'EventTransferCompleted')
                console.log('event', event.args[0] === ownerB.address)
            }
        }

        // console.log(transferIntentResponse)
    })
})
