import { createConfig, http } from 'wagmi'
import { avalancheFuji } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

export const config = createConfig({
  chains: [avalancheFuji],
  connectors: [
    metaMask(),
  ],
  transports: {
    [avalancheFuji.id]: http('https://avax-fuji.g.alchemy.com/v2/50NdBDj31gdaDbPdgk82R'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
