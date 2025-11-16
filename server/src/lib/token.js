import fs from "node:fs/promises";
import path from "path";
import os from "os";
import chalk from "chalk";

const CONFIG_DIR = path.join(os.homedir(), ".orbital-cli");
const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");


export async function getStoredToken() {
    try {
        const data = await fs.readFile(TOKEN_FILE, "utf-8");
        const token = JSON.parse(data);
        return token;
    } catch (error) {
        return null;
    }
}

export async function storeToken(token) {
    try {
        await fs.mkdir(CONFIG_DIR, { recursive: true });


        //store file
        const tokenData = {
            access_token: token.access_token,
            refresh_token: token.refresh_token, //store if available
            token_type: token.token_type || "Bearer",
            scope: token.scope,
            expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
            created_at: new Date().toISOString(),
        };

        await fs.writeFile(TOKEN_FILE, JSON.stringify(tokenData, null, 2), "utf-8");
        return true;
    } catch (error) {
        console.error("Error storing token:", error);
        return false;
    }
}


export async function clearStoredToken() {
    try {
        await fs.unlink(TOKEN_FILE);
        return true;
    } catch (error) {
        console.error("Error clearing stored token:", error);
        return false;
    }
}


export async function isTokenExpired() {
    const token = await getStoredToken();
    if (!token || !token.expires_at) {
        return true;
    }

    const expiresAt = new Date(token.expires_at);
    const now = new Date();

    //considered expired if les than 5 minute remaining
    return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;
}

export async function requiredAuth() {
    const token = await getStoredToken();

    if (!token) {
        console.log(
            chalk.red("No stored token found. Please login first.")
        );
        process.exit(1);
    }

    if (await isTokenExpired()) {
        console.log(
            chalk.red("Stored token has expired. Please login again.")
        );
        process.exit(1);
    }
    return token;
}