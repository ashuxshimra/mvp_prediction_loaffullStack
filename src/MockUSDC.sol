// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing (6 decimals like real USDC)
 * @dev Anyone can mint for testing purposes
 */
contract MockUSDC is ERC20 {
    
    constructor() ERC20("Mock USDC", "USDC") {}

    /**
     * @notice Returns 6 decimals to match real USDC
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mint tokens for testing (anyone can call)
     * @param to Address to mint to
     * @param amount Amount to mint (in USDC units with 6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Convenience function to mint 1000 USDC
     */
    function mintThousand(address to) external {
        _mint(to, 1000 * 10**6); // 1000 USDC with 6 decimals
    }
}