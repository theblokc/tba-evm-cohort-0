// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721URIStorage {
    uint256 tokenId;

    constructor() ERC721("MyERC721Token", "MET") {}

    function mint() external {
        _safeMint(msg.sender, tokenId);
        _setTokenURI(
            tokenId,
            "https://github.com/JohnPaulPabelico/EVM-Projects/blob/main/metadata.json"
        );
        tokenId++;
    }
}