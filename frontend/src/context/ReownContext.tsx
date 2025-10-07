"use client";

import React from "react";
import { wagmiAdapter, reownProjectId } from "../config/reown-config";
import { createAppKit } from "@reown/appkit/react";
import { avalancheFuji } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cookieToInitialState, WagmiProvider } from "wagmi";
import { structuralSharing } from "wagmi/query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      structuralSharing,
    },
  },
});

if (!reownProjectId) {
  throw new Error("REOWN_PROJECT_ID is required");
}

const networks = [
  avalancheFuji,
];

const metadata = {
  name: "Prediction Market MVP",
  description: "Decentralized prediction market built with Foundry and Next.js",
  url: "http://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

createAppKit({
  adapters: [wagmiAdapter],
  projectId: reownProjectId,
  networks,
  defaultNetwork: avalancheFuji,
  metadata: metadata,
  themeMode: "dark",
  debug: true,
  features: {
    analytics: true,
    socials: [
      "google",
      "discord",
      "x",
      "apple",
      "facebook",
      "github",
    ],
    swaps: false,
    history: true,
    legalCheckbox: true,
    walletFeaturesOrder: ["send", "receive", "onramp"],
  },
  enableEIP6963: true,
});

export function AppKitProvider({ children, cookies }: { children: React.ReactNode; cookies?: string }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig, cookies);

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
