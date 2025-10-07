import { Contract, JsonRpcProvider, JsonRpcSigner } from "ethers";
import { avalancheFuji } from "wagmi/chains";

// Contract ABIs
import PredictionMarketAbi from "./abis/PredictionMarket.json";
import MockUSDCAbi from "./abis/MockUSDC.json";
import OutcomeTokenAbi from "./abis/OutcomeToken.json";

// Types
export interface ContractConfig {
  address: string;
  abi: readonly (string | object)[];
  decimals?: number;
}

export interface ContractConfigs {
  [chainId: number]: {
    PredictionMarket: ContractConfig;
    MockUSDC: ContractConfig;
    OutcomeToken: ContractConfig;
  };
}

// Contract configurations for different networks
export const ContractConfigs: ContractConfigs = {
  [avalancheFuji.id]: {
    PredictionMarket: {
      address: "0xb247Ad117E7AB5b63Fd979d2d990807Ee4deF87C", // FINAL deployment with underflow protection
      abi: PredictionMarketAbi.abi,
    },
    MockUSDC: {
      address: "0x7A83C3d4654DD1874CCc32Cd2b98d53EAa6a9Caf", // FINAL deployment
      abi: MockUSDCAbi.abi,
      decimals: 6,
    },
    OutcomeToken: {
      address: "", // Will be set dynamically when markets are created
      abi: OutcomeTokenAbi.abi,
    },
  },
};

// RPC URLs with fallbacks
export const RPC_URLS: Record<number, string[]> = {
  [avalancheFuji.id]: [
    "https://avax-fuji.g.alchemy.com/v2/50NdBDj31gdaDbPdgk82R",
    "https://api.avax-test.network/ext/bc/C/rpc",
    "https://rpc.ankr.com/avalanche_fuji"
  ],
};

// Get provider for a specific chain with fallback
export const getProvider = (chainId: number): JsonRpcProvider | null => {
  const rpcUrls = RPC_URLS[chainId];
  if (!rpcUrls || rpcUrls.length === 0) {
    console.error(`RPC URLs not found for chain ID: ${chainId}`);
    return null;
  }
  
  // Use the first RPC URL (primary)
  const primaryRpcUrl = rpcUrls[0];
  console.log(`Using RPC URL: ${primaryRpcUrl}`);
  return new JsonRpcProvider(primaryRpcUrl);
};

// Get provider with automatic fallback on failure
export const getProviderWithFallback = async (chainId: number): Promise<JsonRpcProvider | null> => {
  const rpcUrls = RPC_URLS[chainId];
  if (!rpcUrls || rpcUrls.length === 0) {
    console.error(`RPC URLs not found for chain ID: ${chainId}`);
    return null;
  }

  for (let i = 0; i < rpcUrls.length; i++) {
    const rpcUrl = rpcUrls[i];
    try {
      console.log(`Trying RPC URL ${i + 1}/${rpcUrls.length}: ${rpcUrl}`);
      const provider = new JsonRpcProvider(rpcUrl);
      
      // Test the connection by getting the network
      await provider.getNetwork();
      console.log(`✅ RPC URL ${i + 1} working: ${rpcUrl}`);
      return provider;
    } catch (error) {
      console.warn(`❌ RPC URL ${i + 1} failed: ${rpcUrl}`, error);
      if (i === rpcUrls.length - 1) {
        console.error('All RPC URLs failed');
        return null;
      }
    }
  }
  
  return null;
};

// Get contract instance for reading with fallback
export const getContractRead = async (
  chainId: number,
  contractName: keyof ContractConfigs[number]
): Promise<Contract | null> => {
  const provider = await getProviderWithFallback(chainId);
  if (!provider) return null;

  const contractConfig = ContractConfigs[chainId]?.[contractName];
  if (!contractConfig) {
    console.error(`Contract config not found for ${contractName} on chain ${chainId}`);
    return null;
  }

  return new Contract(contractConfig.address, contractConfig.abi, provider);
};

// Get contract instance for writing
export const getContractInstance = async (
  chainId: number,
  contractName: keyof ContractConfigs[number],
  signer?: JsonRpcSigner
): Promise<Contract | null> => {
  if (!signer) {
    console.error("Signer is required for write operations");
    return null;
  }

  const contractConfig = ContractConfigs[chainId]?.[contractName];
  if (!contractConfig) {
    console.error(`Contract config not found for ${contractName} on chain ${chainId}`);
    return null;
  }

  return new Contract(contractConfig.address, contractConfig.abi, signer);
};

// Get contract instance with custom address (for OutcomeToken)
export const getContractInstanceWithAddress = async (
  chainId: number,
  contractName: keyof ContractConfigs[number],
  address: string,
  signer?: JsonRpcSigner
): Promise<Contract | null> => {
  const contractConfig = ContractConfigs[chainId]?.[contractName];
  if (!contractConfig) {
    console.error(`Contract config not found for ${contractName} on chain ${chainId}`);
    return null;
  }

  const provider = signer || await getProviderWithFallback(chainId);
  if (!provider) return null;

  return new Contract(address, contractConfig.abi, provider);
};
