// SPDX-License-Identifier:MIT

pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract Oracle is Ownable {
    mapping(address => mapping(address => bool)) public pair;
    mapping(address => mapping(address => uint256)) public price;

    event EventNewPair(address indexed _tokenAddressOne, address indexed _tokenAddressTwo);
    event EventPriceUpdated(
        address indexed _tokenAddressOne,
        address indexed _tokenAddressTwo,
        uint256 indexed _amount
    );
    constructor(address _delegate) Ownable(_delegate) {}

    modifier checkPairNotExist(address _tokenAddressOne, address _tokenAddressTwo) {
        require(pair[_tokenAddressOne][_tokenAddressTwo] == false, "pair already exists");
        _;
    }
    modifier checkPairExist(address _tokenAddressOne, address _tokenAddressTwo) {
        require(pair[_tokenAddressOne][_tokenAddressTwo] == true, "pair already exists");
        _;
    }

    function addPair(
        address _tokenAddressOne,
        address _tokenAddressTwo
    ) external checkPairExist(_tokenAddressOne, _tokenAddressTwo) onlyOwner {
        pair[_tokenAddressOne][_tokenAddressTwo] = true;
        emit EventNewPair(_tokenAddressOne, _tokenAddressTwo);
    }
    function updatePrice(
        address _tokenAddressOne,
        address _tokenAddressTwo,
        uint256 _amount
    ) external checkPairExist(_tokenAddressOne, _tokenAddressTwo) onlyOwner {
        price[_tokenAddressOne][_tokenAddressTwo] = _amount;
        emit EventPriceUpdated(_tokenAddressOne, _tokenAddressTwo, _amount);
    }
}
