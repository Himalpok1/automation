const axios = require('axios');

const KIE_API_URL = 'https://api.kie.ai/v1/chat/completions';

/**
 * Build the prompt asking Kie.ai to return all content fields as JSON.
 */
function buildPrompt(article, topics, tone) {
  return `You are a social media content creator for a tech Facebook page.

News Article:
Title: ${article.title}
Description: ${article.description}
Source URL: ${article.url}

Page Topics: ${topics.join(', ')}
Page Tone: ${tone}

Create engaging social media content based on the news above. Return ONLY a valid JSON object — no markdown, no explanation, just JSON — with exactly these fields:

{
  "headline": "A punchy, attention-grabbing headline. Maximum 12 words.",
  "caption": "2-3 engaging sentences that summarize the news and invite engagement. Match the page tone: ${tone}.",
  "hashtags": "8-10 relevant hashtags as a single string, space-separated (e.g. #AI #Tech #Innovation ...).",
  "imagePrompt": "A detailed, vivid visual description for an AI image generator. Describe the scene, colors, style, and mood that fits the headline. Do not mention text or words in the image."
}`;
}

/**
 * Parse the JSON content returned by the LLM, handling common formatting issues.
 */
function parseJsonResponse(raw) {
  // Strip any markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract a JSON object with regex as a last resort
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse LLM response as JSON');
  }
}

/**
 * Generate headline, caption, hashtags, and imagePrompt using Kie.ai LLM.
 *
 * @param {{ title: string, description: string, url: string }} article
 * @param {string[]} topics
 * @param {string} tone
 * @returns {Promise<{ headline: string, caption: string, hashtags: string, imagePrompt: string }>}
 */
async function generateContent(article, topics, tone) {
  const apiKey = process.env.KIE_API_KEY;

  if (!apiKey) {
    throw new Error('KIE_API_KEY is not set in environment variables');
  }

  const prompt = buildPrompt(article, topics, tone);

  const requestBody = {
    model: 'claude-sonnet-4-6',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.8,
    max_tokens: 800
  };

  let lastError;

  // Try primary model, then fallback
  const models = ['claude-sonnet-4-6', 'gpt-4o'];

  for (const model of models) {
    requestBody.model = model;

    try {
      console.log(`   Trying model: ${model}`);

      const response = await axios.post(KIE_API_URL, requestBody, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const rawContent = response.data?.choices?.[0]?.message?.content;

      if (!rawContent) {
        throw new Error('Empty content returned from LLM API');
      }

      const parsed = parseJsonResponse(rawContent);

      // Validate required fields
      const required = ['headline', 'caption', 'hashtags', 'imagePrompt'];
      for (const field of required) {
        if (!parsed[field]) {
          throw new Error(`Missing field "${field}" in LLM response`);
        }
      }

      return parsed;
    } catch (err) {
      lastError = err;
      console.warn(`   ⚠️  Model "${model}" failed: ${err.message}`);
    }
  }

  throw new Error(`Content generation failed for all models. Last error: ${lastError?.message}`);
}

module.exports = { generateContent };
