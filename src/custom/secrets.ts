import { SecretsApi } from "../api/endpoints/secrets";
import { newInfisicalError } from "./errors";
import { writeFile } from "fs/promises";
import {
  ListSecretsOptions,
  GetSecretOptions,
  UpdateSecretOptions,
  CreateSecretOptions,
  DeleteSecretOptions,
  GetEnvOptions,
  GenerateTypesOptions,
  EnvSchema,
  InferEnvSchema,
  TypedEnv,
} from "../api/types/secrets";
import { generateEnvTypes } from "./typegen";

const convertBool = (value?: boolean) => (value ? "true" : "false");

const defaultBoolean = (value?: boolean, defaultValue: boolean = false) => {
  if (value === undefined) {
    return defaultValue;
  }
  return value;
};

interface GetEnv {
  <TSchema extends EnvSchema>(options: GetEnvOptions & { schema: TSchema }): Promise<InferEnvSchema<TSchema>>;
  <TEnv extends object = TypedEnv>(options: GetEnvOptions): Promise<TEnv>;
}

export default class SecretsClient {
  constructor(private apiClient: SecretsApi) {}

	listSecrets = async (options: ListSecretsOptions) => {
		try {
			const res = await this.apiClient.listSecrets({
				workspaceId: options.projectId,
				environment: options.environment,
				expandSecretReferences: convertBool(defaultBoolean(options.expandSecretReferences, true)),
				include_imports: convertBool(options.includeImports),
				recursive: convertBool(options.recursive),
				secretPath: options.secretPath,
				tagSlugs: options.tagSlugs ? options.tagSlugs.join(",") : undefined,
				viewSecretValue: convertBool(options.viewSecretValue ?? true)
			});

			if (options.attachToProcessEnv) {
				let includedSecrets = res.secrets;
				if (res.imports?.length) {
					for (const imp of res.imports) {
						for (const importSecret of imp.secrets) {
							if (!includedSecrets.find(includedSecret => includedSecret.secretKey === importSecret.secretKey)) {
								includedSecrets.push(importSecret);
							}
						}
					}
				}

				for (const secret of includedSecrets) {
					process.env[secret.secretKey] = secret.secretValue;
				}
			}

			return res;
		} catch (err) {
			throw newInfisicalError(err);
		}
	};

  listSecretsWithImports = async (
    options: Omit<ListSecretsOptions, "includeImports">
  ) => {
    const res = await this.listSecrets({
      ...options,
      includeImports: true,
    });

    let { imports, secrets } = res;
    if (imports) {
      for (const imp of imports) {
        for (const importedSecret of imp.secrets) {
          // CASE: We need to ensure that the imported values don't override the "base" secrets.
          // Priority order is:
					// Local/Preset variables -> Actual secrets -> Imported secrets (high->low)

					// Check if the secret already exists in the secrets list
          if (!secrets.find((s) => s.secretKey === importedSecret.secretKey)) {
            secrets.push({
              ...importedSecret,
              secretPath: imp.secretPath,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              tags: [],
            });
          }
        }
      }
    }

    return secrets;
  };

  private listMergedSecrets = async (options: ListSecretsOptions) => {
    if (options.includeImports === false) {
      return (await this.listSecrets(options)).secrets;
    }
    return this.listSecretsWithImports(options);
  };

  /**
   * Fetches all secrets of an environment (imports included, unless `includeImports` is false) as a typed `{ KEY: value }` object.
   *
   * - Pass a `schema` (e.g. a Zod object) to validate the secrets and get the schema's output type back.
   * - Without a schema, the result is typed by the `InfisicalSecrets` interface (see `generateTypes`), or by the generic you pass.
   */
  getEnv: GetEnv = async (options: GetEnvOptions & { schema?: EnvSchema }) => {
    const { schema, ...listOptions } = options;
    const secrets = await this.listMergedSecrets(listOptions);

    const env: Record<string, string> = {};
    for (const secret of secrets) {
      env[secret.secretKey] = secret.secretValue;
    }

    return schema ? schema.parse(env) : env;
  };

  /**
   * Generates TypeScript declarations for the secrets of an environment, so `getEnv()` returns typed keys.
   * Only secret names and comments are read, never the values.
   */
  generateTypes = async (options: GenerateTypesOptions) => {
    const { outputFile, processEnv, ...listOptions } = options;
    const secrets = await this.listMergedSecrets({
      ...listOptions,
      expandSecretReferences: false,
      viewSecretValue: false,
    });

    const types = generateEnvTypes(
      secrets.map((secret) => ({ key: secret.secretKey, comment: secret.secretComment })),
      { processEnv }
    );

    if (outputFile) {
      await writeFile(outputFile, types);
    }

    return types;
  };

  getSecret = async (options: GetSecretOptions) => {
    try {
      const res = await this.apiClient.getSecret({
        secretName: options.secretName,
        workspaceId: options.projectId,
        environment: options.environment,
        expandSecretReferences: convertBool(
          defaultBoolean(options.expandSecretReferences, true)
        ),
        includeImports: convertBool(options.includeImports),
        secretPath: options.secretPath,
        type: options.type,
        version: options.version,
        viewSecretValue: convertBool(options.viewSecretValue ?? true),
      });
      return res.secret;
    } catch (err) {
      throw newInfisicalError(err);
    }
  };

  updateSecret = async (secretName: string, options: UpdateSecretOptions) => {
    try {
      return await this.apiClient.updateSecret(secretName, {
        workspaceId: options.projectId,
        environment: options.environment,
        secretValue: options.secretValue,
        newSecretName: options.newSecretName,
        secretComment: options.secretComment,
        secretPath: options.secretPath,
        secretReminderNote: options.secretReminderNote,
        secretReminderRepeatDays: options.secretReminderRepeatDays,
        skipMultilineEncoding: options.skipMultilineEncoding,
        tagIds: options.tagIds,
        type: options.type,
        metadata: options.metadata,
      });
    } catch (err) {
      throw newInfisicalError(err);
    }
  };

  createSecret = async (secretName: string, options: CreateSecretOptions) => {
    try {
      return await this.apiClient.createSecret(secretName, {
        workspaceId: options.projectId,
        environment: options.environment,
        secretValue: options.secretValue,
        secretComment: options.secretComment,
        secretPath: options.secretPath,
        secretReminderNote: options.secretReminderNote,
        secretReminderRepeatDays: options.secretReminderRepeatDays,
        skipMultilineEncoding: options.skipMultilineEncoding,
        tagIds: options.tagIds,
        type: options.type,
      });
    } catch (err) {
      throw newInfisicalError(err);
    }
  };

  deleteSecret = async (secretName: string, options: DeleteSecretOptions) => {
    try {
      return await this.apiClient.deleteSecret(secretName, {
        workspaceId: options.projectId,
        environment: options.environment,
        secretPath: options.secretPath,
        type: options.type,
      });
    } catch (err) {
      throw newInfisicalError(err);
    }
  };
}
