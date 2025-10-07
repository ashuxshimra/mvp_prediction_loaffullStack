import { useAccount, useConfig, useBalance } from "wagmi";
import { formatEther } from "viem";
import { useAppKitEvents } from "@reown/appkit/react";
import { useAppKitState } from "@reown/appkit/react";

export const useWallet = () => {
  const { isConnected, address } = useAccount();
  const config = useConfig();
  const currentChain = config.chains.find(
    (chain) => chain.id === config.state.chainId
  );

  const { data: balance } = useBalance({
    address,
    chainId: config.state.chainId,
  });

  const { data: walletEvent, timestamp: walletEventTimestamp } =
    useAppKitEvents();
  const { loading: isWalletLoading } = useAppKitState();

  const formatBalance = (balance: any) => {
    if (!balance) return "0";
    return parseFloat(formatEther(balance.value)).toFixed(4);
  };

  return {
    isConnected,
    address,
    chainId: config.state.chainId,
    currentChain,
    balance: balance ? formatBalance(balance) : "0",
    walletEvent,
    walletEventTimestamp,
    isWalletLoading,
  };
};
