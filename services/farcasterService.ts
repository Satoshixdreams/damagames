
import sdk from '@farcaster/frame-sdk';

export const initFarcaster = async () => {
    try {
        // Inform the Farcaster client that the frame is ready to be displayed
        // We race this against a timeout so the app doesn't hang if the SDK is unresponsive
        await Promise.race([
            sdk.actions.ready(),
            new Promise((resolve) => setTimeout(resolve, 500))
        ]);
    } catch (e) {
        console.debug("Farcaster SDK ready call failed (likely not in a frame)", e);
    }
};

export interface FarcasterUser {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
}

export const getFarcasterContext = async (): Promise<FarcasterUser | null> => {
    // 1. Check URL Params for testing (e.g. ?fid=123)
    const params = new URLSearchParams(window.location.search);
    const mockFid = params.get('fid');
    if (mockFid) {
        console.log("Using Mock FID from URL:", mockFid);
        return {
            fid: parseInt(mockFid),
            username: `user${mockFid}`,
            displayName: `User ${mockFid}`,
            pfpUrl: `https://avatar.vercel.sh/${mockFid}`
        };
    }

    try {
        // 2. Race the SDK context promise against a timeout to prevent hanging
        const contextPromise = sdk.context;
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1000));
        
        const context = await Promise.race([contextPromise, timeoutPromise]) as any;
        
        if (context && context.user) {
            return {
                fid: context.user.fid,
                username: context.user.username,
                displayName: context.user.displayName,
                pfpUrl: context.user.pfpUrl
            };
        }
        return null;
    } catch (e) {
        console.debug("Failed to get Farcaster context", e);
        return null;
    }
};

export const openExternalUrl = (url: string) => {
    try {
        sdk.actions.openUrl(url);
    } catch (e) {
        console.warn("SDK openUrl failed, falling back to window.open", e);
        window.open(url, '_blank');
    }
};
