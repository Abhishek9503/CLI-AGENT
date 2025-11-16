import { cancel, confirm, intro, outro, text, select, spinner, isCancel } from "@clack/prompts";
import { logger } from "better-auth"
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import chalk from "chalk";
import { Command } from "commander";
import fs from "node:fs/promises";
import path from "path";
import os from "os";
import yoctoSpinner from "yocto-spinner";
import open from "open";

import * as z from "zod/v4"
import dotenv from "dotenv";
import { getStoredToken, isTokenExpired, storeToken } from "../../../lib/token.js";
dotenv.config();


const URL = "http://localhost:3005";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CONFIG_DIR = path.join(os.homedir(), ".better-auth");
export const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");

//=============================
// TOKEN MANGEMENT UTILITIES
//===================================


export async function loginAction(opts) {
    const options = z.object({
        serverUrl: z.string().optional(),
        clientId: z.string().optional(),
    }).parse(opts)

    const serverUrl = options.serverUrl || URL;
    const clientId = options.clientId || CLIENT_ID;


    intro(chalk.bgBlue(" 🔒 Authentication "))

    //TOKEN: CHANGE THIS WITH TOKEN MANGEMENT UTILS
    const existingToken = await getStoredToken();  // Set to false to test the login flow
    const expired = await isTokenExpired();

    if (existingToken && !expired) {
        const shouldReAuth = await confirm({
            message: "You are already logged in. Do you want to re-authenticate?",
            initialValue: false,
        })

        if (isCancel(shouldReAuth) || !shouldReAuth) {
            outro("Login cancelled.")
            process.exit(0);
        }
    }

    const authClient = createAuthClient({
        baseURL: serverUrl,
        plugins: [deviceAuthorizationClient()]
    });

    const spinnerInstance = yoctoSpinner({ text: "Requesting device authorization" });

    spinnerInstance.start();


    try {
        const { data, error } = await authClient.device.code({
            client_id: clientId,
            scope: "openid profile email"
        })
        spinnerInstance.stop();

        if (error || !data) {
            logger.error("Failed to initiate device authorization:", error);
            outro("Login failed.");
            process.exit(1);

        }


        const { device_code, user_code, verification_uri, verification_uri_complete, expires_in, interval = 5 } = data;

        console.log(chalk.cyan("Devices Authorization required."));

        console.log(`1. Visit: ${chalk.underline.blue(verification_uri || verification_uri_complete)}`);

        console.log(`2. Enter the code: ${chalk.bold.yellow(user_code)}`);


        const shouldOpen = await confirm({
            message: "Open the verification URL in your browser?",
            initialValue: true,
        })

        if (!isCancel(shouldOpen) && shouldOpen) {
            const urlToOpen = verification_uri_complete || verification_uri;
            await open(urlToOpen);
        }

        console.log(
            chalk.gray(
                `Waiting for authorization... (expires in ${Math.floor(expires_in / 60)} minutes)`
            )
        )

        const token = await pollForToken(
            authClient,
            device_code,
            clientId,
            interval
        );

        if (token) {
            const saved = await storeToken(token);

            if (!saved) {
                outro(chalk.red("✗ Failed to store the token."));
                process.exit(1);
            }
            outro(chalk.green("✓ Successfully logged in!"));
            process.exit(0);
        }

        //TODO: GET THE USER DATA
        outro(chalk.red("✗ Successfully logged in "));

        console.log(chalk.gray("You can use AI commands without logging in again."));


    } catch (error) {
        spinnerInstance.stop();
        logger.error("Device authorization failed:", error);
        outro(chalk.red("✗ Login failed."));
        process.exit(1);
    }
}
async function pollForToken(authClient, deviceCode, clientId, initialIntervalValue) {
    let pollingInterval = initialIntervalValue;
    const spinner = yoctoSpinner({ text: "Waiting for authorization", color: "cyan" });

    return new Promise((resolve, reject) => {
        const poll = async () => {
            if (!spinner.isSpinning) {
                spinner.start();
            }

            try {
                const { data, error } = await authClient.device.token({
                    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                    device_code: deviceCode,
                    client_id: clientId,
                    fetchOptions: {
                        headers: {
                            "user-agent": "Orbital CLI"
                        },
                    },
                });

                if (data?.access_token) {
                    spinner.success("Authorization successful!");
                    console.log(chalk.green("\n✓ Successfully authenticated!"));
                    console.log(chalk.dim(`Token: ${data.access_token.substring(0, 20)}...`));

                    // TODO: Save token to file
                    resolve(data);
                    return;
                }

                if (error) {
                    switch (error.error) {
                        case "authorization_pending":
                            // Continue polling silently
                            break;
                        case "slow_down":
                            pollingInterval += 5;
                            spinner.text = `Slowing down polling to ${pollingInterval}s`;
                            break;
                        case "access_denied":
                            spinner.error("Access was denied by the user");
                            reject(new Error("Access denied"));
                            return;
                        case "expired_token":
                            spinner.error("The device code has expired");
                            reject(new Error("Token expired"));
                            return;
                        default:
                            spinner.error(`Error: ${error.error_description || error.error}`);
                            reject(new Error(error.error_description || error.error));
                            return;
                    }
                }

                // Schedule next poll
                setTimeout(poll, pollingInterval * 1000);
            } catch (err) {
                spinner.error("Network error occurred");
                logger.error("Error polling for token:", err);
                reject(err);
            }
        };

        // Start polling
        setTimeout(poll, pollingInterval * 1000);
    });
}


// ==========================
// COMMAND  SETUP
//===========================


export const login = new Command("login")
    .description("Login to the AI CLI Agent")
    .option("--server-url <url>", "Authentication server URL", URL)
    .option("--client-id <id>", "OAuth Client ID", CLIENT_ID)
    .action(loginAction);