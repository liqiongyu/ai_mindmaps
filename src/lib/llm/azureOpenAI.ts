import { AzureOpenAI } from "openai";

export type AzureOpenAIConfig = {
  apiKey: string;
  endpoint: string;
  apiVersion: string;
  deployment: string;
  model: string;
};

export function getAzureOpenAIConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AzureOpenAIConfig {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Set it in your environment (or in .env) to run Azure OpenAI e2e tests.",
    );
  }

  const endpoint = trimTrailingSlashes(
    env.AZURE_OPENAI_ENDPOINT ?? "https://yuanyang-0691-resource.cognitiveservices.azure.com/",
  );
  const apiVersion = env.AZURE_OPENAI_API_VERSION ?? "2025-04-01-preview";
  const deployment = env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-5-mini";
  const model = env.AZURE_OPENAI_MODEL ?? deployment;

  return { apiKey, endpoint, apiVersion, deployment, model };
}

export function createAzureOpenAIClient(config: AzureOpenAIConfig): AzureOpenAI {
  return new AzureOpenAI({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    apiVersion: config.apiVersion,
    deployment: config.deployment,
  });
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}
