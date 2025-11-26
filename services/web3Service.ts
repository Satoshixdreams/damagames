
// Minimal interface for window.ethereum
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, handler: (...args: any[]) => void) => void;
  removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
}

export const isMetaMaskInstalled = (): boolean => {
  const { ethereum } = window as any;
  return Boolean(ethereum && ethereum.isMetaMask);
};

export const connectWallet = async (): Promise<string> => {
  let provider = (window as any).ethereum;

  console.log("Initiating wallet connection...");

  // Fallback for users without a wallet (Demo Mode)
  // We check if provider is undefined. If so, we seamlessly switch to Demo Mode without scary alerts.
  if (!provider) {
    console.log("No crypto wallet found. Switching to Demo Mode.");
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const demoAddress = "0xDemoUser...8888";
    // Persist demo state so we can auto-connect on reload
    localStorage.setItem("demo_wallet_connected", "true");
    
    // Inform user gently via return, App.tsx handles the UI
    return demoAddress;
  }

  // Handle multiple wallets (EIP-6963 / Injection Conflict)
  if (provider.providers && Array.isArray(provider.providers)) {
    console.log("Multiple providers detected", provider.providers);
    // Prefer MetaMask if available, or take the first one
    const metaMask = provider.providers.find((p: any) => p.isMetaMask);
    if (metaMask) {
      provider = metaMask;
    } else {
      provider = provider.providers[0];
    }
  }

  try {
    console.log("Requesting eth_requestAccounts...");
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts returned.");
    }
    
    console.log("Connected:", accounts[0]);
    return accounts[0];
  } catch (error: any) {
    console.error("Wallet connection error:", error);
    if (error.code === 4001) {
      throw new Error("Connection cancelled.");
    }
    throw new Error("Failed to connect wallet.");
  }
};

export const checkIfWalletIsConnected = async (): Promise<string | null> => {
  // Check demo mode first
  if (localStorage.getItem("demo_wallet_connected") === "true") {
    return "0xDemoUser...8888";
  }

  let provider = (window as any).ethereum;
  
  if (!provider) return null;

  if (provider.providers && Array.isArray(provider.providers)) {
     const metaMask = provider.providers.find((p: any) => p.isMetaMask);
     provider = metaMask || provider.providers[0];
  }

  try {
    // Some wallets might not support eth_accounts without permission, but most do return empty array
    const accounts = await provider.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      return accounts[0];
    }
  } catch (error) {
    console.error("Error checking wallet connection", error);
  }
  return null;
};

export const listenToAccountChanges = (callback: (account: string | null) => void) => {
  const { ethereum } = window as any;
  if (ethereum) {
    try {
      ethereum.on('accountsChanged', (accounts: string[]) => {
        callback(accounts.length > 0 ? accounts[0] : null);
      });
    } catch (e) {
      console.warn("Could not subscribe to account changes", e);
    }
  }
};
