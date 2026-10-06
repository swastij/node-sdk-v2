#!/usr/bin/env node
import { parseArgs } from "util";
import { InfisicalSDK } from "./index";

const USAGE = `Usage: infisical-typegen --project-id <id> --environment <slug> [options]

Generates TypeScript declarations for the secrets of an Infisical environment.

Options:
  --project-id <id>      Project ID (or INFISICAL_PROJECT_ID)
  --environment <slug>   Environment slug (or INFISICAL_ENVIRONMENT)
  --secret-path <path>   Secret path (default: /)
  --recursive            Include secrets from sub folders
  --no-imports           Skip imported secrets
  --process-env          Also augment NodeJS.ProcessEnv
  --output <file>        Output file (default: infisical-env.d.ts)
  --site-url <url>       Infisical instance URL (or INFISICAL_SITE_URL)
  -h, --help             Show this help

Authentication (environment variables):
  INFISICAL_TOKEN        A machine identity access token, or
  INFISICAL_UNIVERSAL_AUTH_CLIENT_ID + INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET
`;

const main = async () => {
  const { values } = parseArgs({
    options: {
      "project-id": { type: "string" },
      environment: { type: "string" },
      "secret-path": { type: "string" },
      recursive: { type: "boolean" },
      "no-imports": { type: "boolean" },
      "process-env": { type: "boolean" },
      output: { type: "string" },
      "site-url": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }

  const projectId = values["project-id"] || process.env.INFISICAL_PROJECT_ID;
  const environment = values.environment || process.env.INFISICAL_ENVIRONMENT;
  if (!projectId || !environment) {
    throw new Error("--project-id and --environment are required");
  }

  const client = new InfisicalSDK({ siteUrl: values["site-url"] || process.env.INFISICAL_SITE_URL });

  const token = process.env.INFISICAL_TOKEN;
  const clientId = process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET;
  if (token) {
    client.auth().accessToken(token);
  } else if (clientId && clientSecret) {
    await client.auth().universalAuth.login({ clientId, clientSecret });
  } else {
    throw new Error(
      "Set INFISICAL_TOKEN, or INFISICAL_UNIVERSAL_AUTH_CLIENT_ID and INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET"
    );
  }

  const outputFile = values.output || "infisical-env.d.ts";
  await client.secrets().generateTypes({
    projectId,
    environment,
    secretPath: values["secret-path"],
    recursive: values.recursive,
    includeImports: !values["no-imports"],
    processEnv: values["process-env"],
    outputFile,
  });

  console.log(`Wrote ${outputFile}`);
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  console.error("Run with --help for usage.");
  process.exit(1);
});
