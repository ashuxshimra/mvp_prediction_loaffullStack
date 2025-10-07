// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OutcomeToken
 * @notice ERC20 token representing YES or NO outcome shares in a prediction market
 * @dev Minted when users buy positions or add liquidity, burned when claiming winnings
 */
contract OutcomeToken is ERC20, Ownable {
    bool public immutable isYes;
    uint256 public immutable marketId;
    
    /**
     * @notice Create a new outcome token
     * @param name Token name (e.g., "YES-0" or "NO-0")
     * @param symbol Token symbol (e.g., "YES" or "NO")
     */
    constructor(
        string memory name,
        string memory symbol,
        bool _isYes,
        uint256 _marketId,
        address initialOwner
    ) ERC20(name, symbol) {
        isYes = _isYes;
        marketId = _marketId;
        _transferOwnership(initialOwner);
    }

    /**
     * @notice Mint tokens to an address (only owner - the PredictionMarket contract)
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from an address (only owner - the PredictionMarket contract)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}