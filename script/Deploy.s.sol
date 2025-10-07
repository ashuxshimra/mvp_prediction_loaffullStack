// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PredictionMarket.sol";
import "../src/MockUSDC.sol";

/**
 * @title Deploy
 * @notice Deployment script for PredictionMarket contracts
 * @dev Run with: forge script script/Deploy.s.sol:Deploy --rpc-url <network> --broadcast --verify
 */
contract Deploy is Script {
    
    function run() external {
        // Get deployer private key from environment
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;
        
        // Handle both formats: with and without 0x prefix
        if (bytes(privateKeyStr).length == 64) {
            // No 0x prefix, add it
            privateKeyStr = string.concat("0x", privateKeyStr);
        }
        deployerPrivateKey = vm.parseUint(privateKeyStr);
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get oracle address (can be same as deployer for testnet)
        address oracle = vm.envOr("ORACLE_ADDRESS", deployer);
        
        // Get settlement token address (if not provided, deploy MockUSDC for testnet)
        address settlementToken = vm.envOr("SETTLEMENT_TOKEN", address(0));
        
        console.log("=== Prediction Market Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Oracle:", oracle);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy or use existing settlement token
        if (settlementToken == address(0)) {
            console.log("\n--- Deploying MockUSDC ---");
            MockUSDC mockUSDC = new MockUSDC();
            settlementToken = address(mockUSDC);
            console.log("MockUSDC deployed at:", settlementToken);
            
            // Mint some USDC to deployer for testing
            mockUSDC.mint(deployer, 100000 * 10**6); // 100k USDC
            console.log("Minted 100,000 USDC to deployer");
        } else {
            console.log("Using existing settlement token:", settlementToken);
        }
        
        // Deploy PredictionMarket
        console.log("\n--- Deploying PredictionMarket ---");
        PredictionMarket predictionMarket = new PredictionMarket(
            settlementToken,
            oracle
        );
        console.log("PredictionMarket deployed at:", address(predictionMarket));
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("Settlement Token:", settlementToken);
        console.log("PredictionMarket:", address(predictionMarket));
        console.log("Oracle:", oracle);
        console.log("Trading Fee:", predictionMarket.tradingFee(), "bps");
        
        // Save deployment addresses to file
        string memory deployments = string.concat(
            "{\n",
            '  "network": "', _getNetworkName(), '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "settlementToken": "', vm.toString(settlementToken), '",\n',
            '  "predictionMarket": "', vm.toString(address(predictionMarket)), '",\n',
            '  "oracle": "', vm.toString(oracle), '",\n',
            '  "deployer": "', vm.toString(deployer), '"\n',
            "}\n"
        );
        
        // Deployment addresses logged above
    }
    
    function _getNetworkName() internal view returns (string memory) {
        uint256 chainId = block.chainid;
        
        if (chainId == 84532) return "base-sepolia";
        if (chainId == 421614) return "arbitrum-sepolia";
        if (chainId == 43113) return "avalanche-fuji";
        if (chainId == 8453) return "base";
        if (chainId == 42161) return "arbitrum";
        if (chainId == 43114) return "avalanche";
        if (chainId == 1) return "mainnet";
        if (chainId == 5) return "goerli";
        if (chainId == 11155111) return "sepolia";
        if (chainId == 31337) return "localhost";
        
        return string.concat("unknown-", vm.toString(chainId));
    }
}