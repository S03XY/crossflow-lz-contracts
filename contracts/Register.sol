// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import "hardhat/console.sol";

contract Register is Ownable {
    using OptionsBuilder for bytes;

    struct Fees {
        uint256 registrationFees;
        uint256 updateDomainFees;
    }

    Fees public fees;
    mapping(string => address) public domainToAddress;
    mapping(address => bool) public isRegistered;

    constructor(address _delegate, uint registrationFees, uint updateDomainfees) Ownable(_delegate) {
        fees = Fees(registrationFees, updateDomainfees);
    }

    event EventRegisterIntent(string indexed _domain, address indexed _address);
    event EventUpdateDomainIntent(string indexed _domain, address indexed _address);

    event EventDomainRegistered(string indexed _domain, address indexed _address);
    event EventDomainUpdated(string indexed _domain, address indexed _address);

    event EventFeesUpdated(uint indexed _registrationFees, uint indexed _updateDomainFees);

    modifier checkRegisterFees() {
        require(msg.value == fees.registrationFees, "incorrect registration fees");
        _;
    }
    modifier checkUpdateFees() {
        require(msg.value == fees.updateDomainFees, "incorrect update fees");
        _;
    }

    function makeRegisterIntent(string calldata _domain) external payable checkRegisterFees {
        emit EventRegisterIntent(_domain, msg.sender);
    }

    function reserveDomain(address _address, string calldata _domain) external onlyOwner {
        require(isRegistered[_address] == false, "address already registered");
        require(domainToAddress[_domain] == address(0), "domain already registered");
        domainToAddress[_domain] = _address;
        emit EventDomainRegistered(_domain, _address);
    }

    function updateDomainIntent(string calldata _domain, address _newAddress) external payable checkUpdateFees {
        require(domainToAddress[_domain] != address(0), "domain not registered");
        require(domainToAddress[_domain] == msg.sender, "unauthorized");
        emit EventUpdateDomainIntent(_domain, _newAddress);
    }

    function updateDomain(string calldata _domain, address _newAddress) external onlyOwner {
        require(domainToAddress[_domain] != address(0), "domain not registered");
        domainToAddress[_domain] = _newAddress;
        emit EventDomainUpdated(_domain, _newAddress);
    }

    function updateRegistrationFees(uint _fees) external onlyOwner {
        fees.registrationFees = _fees;
    }

    function updateUpdateDomainFees(uint _fees) external onlyOwner {
        fees.updateDomainFees = _fees;
        emit EventFeesUpdated(fees.registrationFees, fees.updateDomainFees);
    }
}
