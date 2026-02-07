import dotenv from "dotenv";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
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

  test("responses.parse supports structured JSON output", async () => {
    const config = getAzureOpenAIConfigFromEnv(process.env);
    const client = createAzureOpenAIClient(config);

    const OutputSchema = z
      .object({
        answer: z.string(),
      })
      .strict();

    const response = await client.responses.parse({
      model: config.model,
      input: "Return answer: OK",
      max_output_tokens: 256,
      text: {
        format: zodTextFormat(OutputSchema, "mma_e2e_ok"),
      },
    });

    expect(response.output_parsed?.answer.trim().length).toBeGreaterThan(0);
  });

  test("responses.create supports json_object output", async () => {
    const config = getAzureOpenAIConfigFromEnv(process.env);
    const client = createAzureOpenAIClient(config);

    const response = await client.responses.create({
      model: config.model,
      input: 'Return a JSON object: { "ok": true }',
      max_output_tokens: 256,
      reasoning: { effort: "minimal" },
      text: {
        format: { type: "json_object" },
      },
    });

    const parsed = JSON.parse(response.output_text);
    expect(parsed).toHaveProperty("ok", true);
  });
});
