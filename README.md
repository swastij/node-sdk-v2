<h1 align="center">
  <img width="300" src="/img/logoname-white.svg#gh-dark-mode-only" alt="infisical">
</h1>
<p align="center">
  <p align="center"><b>Infisical Node.js SDK</b></p>
<h4 align="center">
|
  <a href="https://infisical.com/docs/sdks/languages/node">Documentation</a> |
  <a href="https://www.infisical.com">Website</a> |
  <a href="https://infisical.com/slack">Slack</a> |
</h4>

<h4 align="center">
  <a href="https://github.com/Infisical/node-sdk-v2/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Infisical SDK's are released under the MIT license." />
  </a>
  <a href="https://infisical.com/slack">
    <img src="https://img.shields.io/badge/chat-on%20Slack-blueviolet" alt="Slack community channel" />
  </a>
  <a href="https://twitter.com/infisical">
    <img src="https://img.shields.io/twitter/follow/infisical?label=Follow" alt="Infisical Twitter" />
  </a>
</h4>

## Introduction

**[Infisical](https://infisical.com)** is the open source secret management platform that teams use to centralize their secrets like API keys, database credentials, and configurations.

If you’re working with Node.js, the official Infisical Node.js SDK package is the easiest way to fetch and work with secrets for your application. You can read the documentation [here](https://infisical.com/docs/sdks/languages/node).

## Requirements

| SDK version | Node.js version |
|-------------|-----------------|
| >= v5       | >= 20           |
| <= v4       | >= 14           |

Starting from **v5**, the SDK requires **Node.js 20 or higher** due to updated AWS SDK dependencies.

## Documentation
You can find the documentation for the Node.js SDK on our [SDK documentation page](https://infisical.com/docs/sdks/languages/node).

## Typed secrets

`secrets().getEnv()` returns all secrets of an environment as a typed `{ KEY: value }` object.

### Generate types from your environment

The `infisical-typegen` CLI reads the secret names of an environment (never the values) and writes a declaration file:

```bash
INFISICAL_TOKEN=<access-token> npx infisical-typegen --project-id <project-id> --environment dev --output infisical-env.d.ts
```

Once the generated file is included in your `tsconfig.json`, every key is typed:

```ts
const env = await client.secrets().getEnv({ projectId: "<project-id>", environment: "dev" });

env.DATABASE_URL; // string
env.DOES_NOT_EXIST; // compile error
```

Pass `--process-env` to also type `process.env` (useful with `attachToProcessEnv: true`). Run `npx infisical-typegen --help` for all options, or call `client.secrets().generateTypes()` to do the same from code.

### Validate with a schema

Pass a schema (for example a [Zod](https://zod.dev) object) to validate the secrets at runtime and get non-string types:

```ts
import { z } from "zod";

const env = await client.secrets().getEnv({
  projectId: "<project-id>",
  environment: "dev",
  schema: z.object({
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number(),
  }),
});

env.PORT; // number
```

## Security

Please do not file GitHub issues or post on our public forum for security vulnerabilities, as they are public!

Infisical takes security issues very seriously. If you have any concerns about Infisical or believe you have uncovered a vulnerability, please get in touch via the e-mail address security@infisical.com. In the message, try to provide a description of the issue and ideally a way of reproducing it. The security team will get back to you as soon as possible.

Note that this security address should be used only for undisclosed vulnerabilities. Please report any security problems to us before disclosing it publicly.
