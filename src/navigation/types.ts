export type RootStackParamList = {
  Onboarding: undefined;
  Auth: { custody: 'non_custodial' | 'custodial' } | undefined;
  Wallet: undefined;
  Send: undefined;
  Receive: undefined;
  CorridorSelection: undefined;
  Quote: {
    corridor: string;
    sourceAsset: string;
    destinationAsset: string;
  };
  AnchorSelection: { quoteId: string; sourceAmount: string } | undefined;
  CreateRemittance: {
    quoteId: string;
    sourceAmount: string;
    anchorId: string;
    recipientAddress: string;
  };
  Sep24WebView: {
    url: string;
    sepTransactionId: string;
    remittanceId?: string;
    expectedResult: 'deposit' | 'withdraw';
  };
  Sep6Instructions: {
    sepTransactionId: string;
    remittanceId?: string;
    instructions: Record<string, unknown>;
  };
  RemittanceDetail: { id: string };
  PathPayment: undefined;
  Activity: undefined;
  OfflineQueue: undefined;
  Security: undefined;
  Settings: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}