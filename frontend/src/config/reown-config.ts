import { cookieStorage, createStorage, http } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { avalancheFuji } from "wagmi/chains";

export const reownProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "bd0bdff0ef88c8b086eb75bab6f3e966";

if (!reownProjectId) {
  throw new Error("REOWN_PROJECT_ID is required");
}

export const networks = [
  avalancheFuji,
];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
    key: "reown",
  }),
  ssr: true,
  networks,
  projectId: reownProjectId,
  transports: {
    [avalancheFuji.id]: http("https://api.avax-test.network/ext/bc/C/rpc"), // Use fallback RPC
  },
});

export const config = wagmiAdapter.wagmiConfig;
