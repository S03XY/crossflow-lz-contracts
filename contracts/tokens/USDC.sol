// SPDX-License-Identifier:MIT

pragma solidity ^0.8.22;

import { MessagingFee, Origin } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OAppOptionsType3.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";

import "hardhat/console.sol";

contract USDC is OFT {
    using OFTMsgCodec for bytes;
    using OFTMsgCodec for bytes32;

    event EventTransferIntent(address indexed sender, string indexed _domain, uint32 indexed _dstEid, uint _amount);
    event EventTransferCompleted(
        address indexed _fromAddress,
        address indexed _toAddress,
        uint _amount,
        bytes32 _fromDomain,
        bytes32 _toDomain
    );

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        _mint(_delegate, 1000 ether);
    }

    function encodeTransferIntent(
        string memory _domain,
        uint _amount,
        uint32 _dstEid,
        uint16 _msgType,
        address _destinationContract,
        address _sender,
        bytes memory _extraReturnOptions
    ) public pure returns (bytes memory) {
        uint256 extraOptionsLength = _extraReturnOptions.length;
        return
            abi.encode(
                _domain,
                _amount,
                _dstEid,
                _msgType,
                _sender,
                extraOptionsLength,
                _extraReturnOptions,
                extraOptionsLength,
                _destinationContract
            );
    }

    function decodeTransferIntent(
        bytes calldata encodedMessage
    )
        public
        pure
        returns (
            string memory _domain,
            uint _amount,
            uint32 _dstEid,
            uint16 _msgType,
            address sender,
            uint256 extraOptionsStart,
            uint256 extraOptionsLength
        )
    {
        extraOptionsStart = 224;

        (_domain, _amount, _dstEid, _msgType, sender, extraOptionsLength) = abi.decode(
            encodedMessage,
            (string, uint, uint32, uint16, address, uint256)
        );

        return (_domain, _amount, _dstEid, _msgType, sender, extraOptionsStart, extraOptionsLength);
    }

    function transferIntent(string memory _domain, uint _amount, uint32 _dstEid) external payable {
        emit EventTransferIntent(msg.sender, _domain, _dstEid, _amount);
    }

    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address /*_executor*/, // @dev unused in the default implementation.
        bytes calldata /*_extraData*/ // @dev unused in the default implementation.
    ) internal virtual override {
        address toAddress = _message.sendTo().bytes32ToAddress();
        uint256 amountReceivedLD = _credit(toAddress, _toLD(_message.amountSD()), _origin.srcEid);

        if (_message.isComposed()) {
            bytes memory data = _message.composeMsg();
            (, address fromAddress, bytes32 fromDomain, bytes32 toDomain) = abi.decode(
                data,
                (bytes32, address, bytes32, bytes32)
            );

            emit EventTransferCompleted(fromAddress, toAddress, amountReceivedLD, fromDomain, toDomain);
        }

        emit OFTReceived(_guid, _origin.srcEid, toAddress, amountReceivedLD);
    }
}
