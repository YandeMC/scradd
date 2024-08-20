# Scrub

## About

Scrub is a custom all-in-one Discord bot for the [Scratch Coders server](https://discord.gg/FPv957V6SD). It has many features, including punishments, auto moderation, XP tracking, and more. Scrub is also equipped with features specific to Scratch Coders, such as project search, suggestion tools, fun games, inside jokes, and additional utilities.

> [!NOTE] > **Scrub is a fork of Scradd,** an original bot developed for the Scratch Addons server. Scradd was created by @RedGuy12 (`cobaltt7` on Discord), and Scrub builds upon the foundation established by Scradd.

## Contributors

Scrub is developed by @yande.dev on Discord (GitHub: `theyande`). For more details on contributors, please run `/credits` in the server. Special thanks to everyone involved, including the original creators of Scradd!

> [!TIP] Contributions are welcome! If you'd like to help develop Scrub, please read through the [Contributing Guidelines](/.github/CONTRIBUTING.md) before submitting a pull request.

## Setup

### Create a bot

1. Visit [the Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Note the “Application ID” for future use.
3. Go to the “Bot” tab and add a bot to the application.
4. **Highly recommended:** Disable the “Public Bot” option to prevent unauthorized additions to other servers.
5. Make sure to enable all three of the Privileged Gateway Intents (Presence, Server Members, and Message Content Intents).
6. Click “Reset Token” and note it for future use.

> [!IMPORTANT] Disabling the “Public Bot” option is crucial to prevent the bot from being added to unauthorized servers.

### Set up the testing server

1. Create a new server using the [Scrub Testing server template](https://discord.new/htbTxKBq6EVp).
2. Enable Community in Server Settings. Use `#info` for the Rules or Guidelines channel and `#mod-logs` for the Community Updates Channel.
3. Enable Developer Mode under User Settings → Advanced.
4. Right-click on your new testing server, copy its ID, and note it for future use.
5. Invite your bot using the URL: `https://discord.com/oauth2/authorize?client_id=[APPLICATION_ID_HERE]&guild_id=[SERVER_ID_HERE]&permissions=8&scope=applications.commands%20bot`

### Set up MongoDB

1. [Create a MongoDB account](https://www.mongodb.com/cloud/atlas/register) if you don't already have one.
2. When prompted to deploy a cluster, select a free M0 cluster and name it Scrub. Default settings are acceptable.
3. Set up authentication with a username and password. Note the password for future use.
4. Opt to connect from your local environment and add your current IP address to the whitelist. If you plan to work from multiple locations, you can use `0.0.0.0/0` to allow connections from any IP address.

> [!CAUTION] Be cautious when using `0.0.0.0/0`, as it allows connections from any IP address.

5. Once the cluster is created, select “Get connection string” under “Application Development”. Copy the connection string, replace `<password>` with your password, and note it for future use.

### Set up the repository locally

1. Download [git](https://git-scm.com) and [Node.js](https://nodejs.org) if not already installed.
2. Clone the repository using the `git clone` command.
3. Install dependencies with `npm install`.
4. Set up the `.env` file as described below:

> [!INFO] Example `.env` file:
>
> ```
> BOT_TOKEN=
> CANVAS=true # optional
> CLIENT_SECRET= # optional, but will cause errors when using website features. Recommended to remove the port if disabling this.
> GUILD_ID=
> MONGO_URI=
> PORT= # optional
> NODE_ENV=development or production
> ```

> [!WARNING] If you do not set the `CLIENT_SECRET`, some website features may not work properly. To avoid errors, it is recommended to either provide the `CLIENT_SECRET` or remove the port from the configuration if you're disabling this feature.

5. Start coding!

> [!NOTE] Make sure your dependencies are installed and your `.env` file is correctly configured before beginning development.

## Development

### File structure

Scrub is built using [strife.js](https://www.npmjs.com/package/strife.js) and follows its recommended style guide and structure. The `common` directory contains code shared across multiple features, while the `util` directory includes utility functions that can be used in other projects as well.

### Commands

Scrub provides several development commands to streamline the coding process.

-   `npm run build`: One-time build with TypeScript
-   `npm run start`: Run the bot
-   `npm run dev`: runs watch and serve
-   `npm run serve`: Run the bot and restart with nodemon on each successful build
-   `npm run watch`: Rebuild with TypeScript on each code change
-   `npm run format`: Format code with Prettier
-   `npm run lint`: Lint code with ESLint
-   `npm run test`: Run unit tests with the Node.js native test runner

> [!TIP] Use `npm run dev` during development to automatically rebuild and run the bot whenever you make changes.
