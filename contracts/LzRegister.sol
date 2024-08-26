// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

contract LzRegister is Ownable, OApp {
    uint256 public registrationFees;
    mapping(string => address) public domainToAddress;
    mapping(address => bool) public isRegistered;

    constructor(address _endpoint, address _delegate) OApp(_endpoint, _delegate) Ownable(_delegate) {}

    event EventRegisterIntent(string indexed _domain, address indexed _address);
    event EventDomainRegistered(string indexed _domain, address indexed _address);

    modifier checkRegisterFees() {
        require(msg.value == registrationFees, "incorrect registration fees");
        _;
    }

    function makeRegisterIntent(string calldata _domain) external payable checkRegisterFees {
        emit EventRegisterIntent(_domain, msg.sender);
    }

    function reserveDomain(address _address, string calldata _domain) external onlyOwner {
        require(isRegistered[_address] == false, "address already registered");
        require(domainToAddress[_domain] == address(0), "domain already registered");
        emit EventDomainRegistered(_domain, _address);
    }

    function getDomainToAddressCrosschain(
        uint32 _dstEid,
        string memory _domain,
        bytes calldata _options
    ) external payable returns (MessagingReceipt memory receipt) {}

    function quote(
        uint32 _dstEid,
        string memory _message,
        bytes memory _options,
        bool _payInLzToken
    ) public view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(_message);
        fee = _quote(_dstEid, payload, _options, _payInLzToken);
    }

    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {}
}
