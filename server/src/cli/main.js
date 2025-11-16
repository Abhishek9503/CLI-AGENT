#!/usr/bin/env node

import dotenv from "dotenv";
import chalk from "chalk";
import figlet from "figlet";

import { Command } from "commander";
import { login } from "./commands/auth/login.js";

dotenv.config();



async function main() {
    //Dispaly banner

    console.log(
        chalk.cyan(
            figlet.textSync("AI CLI Agent", {
                font: "Standard",
                horizontalLayout: "default",
            })
        )
    )

    console.log(chalk.green("Welcome to the AI CLI Agent!"));

    const program = new Command("orbital");

    program.version("1.0.0")
    .description("AI Powered CLI Agent")
    .addCommand(login)
    program.action(() => {
        program.help();
    });

    program.parse()
}

main().catch((error) => {
    console.error(chalk.red("An error occurred while running the AI CLI Agent:"));
    console.error(error);
    process.exit(1);
});