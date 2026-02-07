import dotenv from "dotenv";
import { describe, expect, test } from "vitest";

import { createAzureOpenAIClient, getAzureOpenAIConfigFromEnv } from "../lib/llm/azureOpenAI";

dotenv.config({ path: ".env", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });

describe("azure openai (e2e)", () => {
  test("responses.create returns non-empty output_text", async () => {
    const config = getAzureOpenAIConfigFromEnv(process.env);
    const client = createAzureOpenAIClient(config);

    const response = await client.responses.create({
      model: config.model,
      input: "Reply with a single word: OK",
      max_output_tokens: 256,
    });

    expect(response.output_text.trim().length).toBeGreaterThan(0);
  });
});
