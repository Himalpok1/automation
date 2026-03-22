const axios = require('axios');

const GENERATE_URL = 'https://api.kie.ai/api/v1/gpt4o-image/generate';
const POLL_URL = 'https://api.kie.ai/api/v1/gpt4o-image/record-info';

const POLL_INTERVAL_MS = 5000;  // 5 seconds between polls
const MAX_ATTEMPTS = 24;        // 24 × 5s = 2 minutes max

// Task status codes returned by the Kie.ai polling endpoint
const STATUS = {
  GENERATING: 0,
  SUCCESS: 1,
  FAILED: 2,
  ERROR: 3
};

/**
 * Submit an image generation request to Kie.ai.
 *
 * @param {string} imagePrompt - The detailed visual prompt
 * @returns {Promise<string>} taskId
 */
async function submitImageJob(imagePrompt) {
  const apiKey = process.env.KIE_API_KEY;

  const response = await axios.post(
    GENERATE_URL,
    { prompt: imagePrompt },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );

  const taskId = response.data?.taskId || response.data?.data?.taskId || response.data?.id;

  if (!taskId) {
    throw new Error(`No taskId in image generation response: ${JSON.stringify(response.data)}`);
  }

  return taskId;
}

/**
 * Poll the Kie.ai image status endpoint until the image is ready or an error occurs.
 *
 * @param {string} taskId
 * @returns {Promise<string|null>} image URL or null on failure
 */
async function pollForImage(taskId) {
  const apiKey = process.env.KIE_API_KEY;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    try {
      const response = await axios.get(POLL_URL, {
        params: { taskId },
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        timeout: 10000
      });

      const data = response.data?.data || response.data;
      const status = data?.status ?? data?.taskStatus;

      console.log(`   🕐 Poll attempt ${attempt}/${MAX_ATTEMPTS} — status: ${status}`);

      if (status === STATUS.SUCCESS) {
        // Image URL may be nested differently depending on API version
        const imageUrl =
          data?.imageUrl ||
          data?.output?.imageUrl ||
          data?.result?.imageUrl ||
          data?.images?.[0] ||
          data?.url;

        if (!imageUrl) {
          throw new Error(`Image succeeded but URL not found in response: ${JSON.stringify(data)}`);
        }

        return imageUrl;
      }

      if (status === STATUS.FAILED || status === STATUS.ERROR) {
        throw new Error(`Image generation task ended with status ${status}`);
      }

      // status === STATUS.GENERATING — keep polling
    } catch (pollErr) {
      // Only propagate non-network errors (final failure statuses)
      if (pollErr.message.includes('status')) {
        throw pollErr;
      }
      console.warn(`   ⚠️  Poll error (attempt ${attempt}): ${pollErr.message}`);
    }
  }

  throw new Error(`Image generation timed out after ${MAX_ATTEMPTS} attempts (${(MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s)`);
}

/**
 * Generate an image using Kie.ai and return the final URL.
 * Returns null if image generation fails, so the caller can fall back to text-only posting.
 *
 * @param {string} imagePrompt
 * @returns {Promise<string|null>}
 */
async function generateImage(imagePrompt) {
  const apiKey = process.env.KIE_API_KEY;

  if (!apiKey) {
    console.error('❌ KIE_API_KEY is not set — cannot generate image');
    return null;
  }

  try {
    console.log('   Submitting image generation job to Kie.ai...');
    const taskId = await submitImageJob(imagePrompt);
    console.log(`   Task ID: ${taskId} — polling for result...`);

    const imageUrl = await pollForImage(taskId);
    console.log(`   Image ready: ${imageUrl}`);
    return imageUrl;
  } catch (err) {
    console.error(`❌ Image generation failed: ${err.message}`);
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { generateImage };
