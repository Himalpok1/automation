const axios = require('axios');

const FB_API_VERSION = 'v19.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

/**
 * Compose the full post message from content parts.
 */
function buildCaption(headline, caption, hashtags) {
  return `${headline}\n\n${caption}\n\n${hashtags}`;
}

/**
 * Post a photo with caption to a Facebook page.
 *
 * @param {string} pageId
 * @param {string} accessToken
 * @param {string} imageUrl
 * @param {string} message - The full post text
 * @returns {Promise<string>} Facebook post ID
 */
async function postPhoto(pageId, accessToken, imageUrl, message) {
  const response = await axios.post(
    `${FB_BASE_URL}/${pageId}/photos`,
    {
      url: imageUrl,
      caption: message,
      access_token: accessToken
    },
    { timeout: 20000 }
  );

  const postId = response.data?.post_id || response.data?.id;

  if (!postId) {
    throw new Error(`No post ID returned from Facebook Photos API: ${JSON.stringify(response.data)}`);
  }

  return postId;
}

/**
 * Post a text-only update to a Facebook page (fallback when image generation fails).
 *
 * @param {string} pageId
 * @param {string} accessToken
 * @param {string} message - The full post text
 * @returns {Promise<string>} Facebook post ID
 */
async function postTextOnly(pageId, accessToken, message) {
  const response = await axios.post(
    `${FB_BASE_URL}/${pageId}/feed`,
    {
      message,
      access_token: accessToken
    },
    { timeout: 20000 }
  );

  const postId = response.data?.id;

  if (!postId) {
    throw new Error(`No post ID returned from Facebook Feed API: ${JSON.stringify(response.data)}`);
  }

  return postId;
}

/**
 * Publish content to a Facebook page.
 * If imageUrl is provided, posts with image; otherwise falls back to text-only.
 *
 * @param {{ pageId: string, accessToken: string, name: string }} page
 * @param {{ headline: string, caption: string, hashtags: string }} content
 * @param {string|null} imageUrl
 * @returns {Promise<string>} Facebook post ID
 */
async function postToFacebook(page, content, imageUrl) {
  const { pageId, accessToken, name } = page;
  const { headline, caption, hashtags } = content;

  if (!pageId || pageId === 'REPLACE_WITH_PAGE_ID') {
    throw new Error(`Page ID not configured for "${name}"`);
  }

  if (!accessToken || accessToken === 'REPLACE_WITH_ACCESS_TOKEN') {
    throw new Error(`Access token not configured for "${name}"`);
  }

  const message = buildCaption(headline, caption, hashtags);

  if (imageUrl) {
    try {
      console.log('   Posting with image to Facebook...');
      const postId = await postPhoto(pageId, accessToken, imageUrl, message);
      console.log(`   ✅ Posted successfully! Post ID: ${postId}`);
      return postId;
    } catch (imgErr) {
      console.warn(`   ⚠️  Photo post failed (${imgErr.message}), falling back to text-only...`);
    }
  } else {
    console.log('   ⚠️  No image available — posting text-only...');
  }

  // Text-only fallback
  const postId = await postTextOnly(pageId, accessToken, message);
  console.log(`   ✅ Text post successful! Post ID: ${postId}`);
  return postId;
}

module.exports = { postToFacebook };
