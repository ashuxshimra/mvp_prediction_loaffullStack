// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PredictionMarket.sol";
import "../src/MockUSDC.sol";

/**
 * @title DeploySimple
 * @notice Simplified deployment script without file operations
 */
contract DeploySimple is Script {
    
    function run() external {
        // Get deployer private key from environment
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;
        
        // Handle both formats: with and without 0x prefix
        if (bytes(privateKeyStr).length == 64) {
            privateKeyStr = string.concat("0x", privateKeyStr);
        }
        deployerPrivateKey = vm.parseUint(privateKeyStr);
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== Prediction Market Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MockUSDC
        console.log("\n--- Deploying MockUSDC ---");
        MockUSDC mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed at:", address(mockUSDC));
        
        // Mint some USDC to deployer for testing
        mockUSDC.mint(deployer, 100000 * 10**6); // 100k USDC
        console.log("Minted 100,000 USDC to deployer");
        
        // Deploy PredictionMarket
        console.log("\n--- Deploying PredictionMarket ---");
        PredictionMarket predictionMarket = new PredictionMarket(
            address(mockUSDC),
            deployer
        );
        console.log("PredictionMarket deployed at:", address(predictionMarket));
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("Settlement Token:", address(mockUSDC));
        console.log("PredictionMarket:", address(predictionMarket));
        console.log("Oracle:", deployer);
        console.log("Trading Fee:", predictionMarket.tradingFee(), "bps");
    }
}
