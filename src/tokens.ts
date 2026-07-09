export type SupportedToken = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
};

export const supportedTokens: SupportedToken[] = [
  {
    symbol: "LINK",
    name: "Chainlink",
    address: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    decimals: 18
  }
];
