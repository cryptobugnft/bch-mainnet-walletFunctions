import { Wallet, TokenSendRequest } from "mainnet-js";
import config from "./config.json"; 

let wallet;

async function initializeWallet() {
    try {
        const seed = process.env.SEED;
        if (!seed) {
            throw new Error("Seed not provided");
        }
        wallet = await Wallet.fromSeed(seed, "m/44'/145'/0'/0/0");
    } catch (error) {
        console.error("Error initializing wallet:", error);
        throw new Error("Error initializing wallet");
    }
}

async function sendTokens(userAddress, tokenAmount, tokenId) {
    try {
        if (!wallet) {
            throw new Error("Wallet not initialized");
        }
        // Send tokens
        const { txId } = await wallet.send([new TokenSendRequest({
            cashaddr: userAddress,
            amount: tokenAmount,
            tokenId: tokenId
        })]);
        return txId;
    } catch (error) {
        console.error("Error sending tokens:", error);
        throw new Error("Error sending tokens");
    }
}

async function fetchFungibleToken(tokenId) {
    try {
        const arrayTokens = [];
        const bcmrIndexer = config.bcmrIndexer; 

        const tokenUtxos = await wallet.getTokenUtxos();
        const fungibleTokensResult = {};
        for (const utxo of tokenUtxos) {
            if (utxo.token?.amount && (!tokenId || utxo.token.tokenId === tokenId)) {
                const tokenId = utxo.token.tokenId;
                if (!fungibleTokensResult[tokenId]) {
                    fungibleTokensResult[tokenId] = {
                        balance: 0n,
                        icon: null
                    };
                }
                fungibleTokensResult[tokenId].balance += utxo.token.amount;
            }
        }

        const metadataPromises = Object.keys(fungibleTokensResult).map(async tokenId => {
            const tokenData = fungibleTokensResult[tokenId];
            try {
                const response = await fetch(`${bcmrIndexer}/registries/${tokenId}/latest`);
                if (response.status !== 404) {
                    const jsonResponse = await response.json();
                    if (jsonResponse.icon) {
                        tokenData.icon = jsonResponse.icon;
                    }
                }
            } catch (error) {
                console.error(error);
            }
            arrayTokens.push({ tokenId, balance: tokenData.balance, icon: tokenData.icon });
        });

        await Promise.all(metadataPromises);

        return arrayTokens;
    } catch (error) {
        console.error("Error fetching fungible token:", error);
        throw new Error("Error fetching fungible token");
    }
}

export { initializeWallet, sendTokens, fetchFungibleToken };
