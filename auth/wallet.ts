/**
 * Wallet authentication module
 * Handles World App wallet authentication
 */

export async function walletAuth() {
  try {
    // In development mode, always use mock authentication
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Using mock wallet authentication');

      // Simulate a successful wallet connection
      const mockPayload = {
        address: '0x' + Math.random().toString(16).substring(2, 42),
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
      };

      // Simulate async delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        ok: true,
        payload: mockPayload,
      };
    }

    // Production mode - use MiniKit
    // Dynamic import to avoid loading MiniKit in development
    const { MiniKit } = await import('@worldcoin/minikit-js');

    if (MiniKit.isInstalled()) {
      try {
        const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
          nonce: Math.random().toString(36).substring(7),
        });

        return {
          ok: true,
          payload: finalPayload,
        };
      } catch (mkError) {
        console.error('MiniKit wallet auth failed:', mkError);
        throw new Error('Failed to authenticate with World App wallet');
      }
    } else {
      throw new Error('World App is required for wallet authentication');
    }
  } catch (error) {
    console.error('Wallet authentication failed:', error);
    throw error;
  }
}