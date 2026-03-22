require('dotenv').config();

const cron = require('node-cron');
const pages = require('../pages.config');
const { fetchNews } = require('./newsFetcher');
const { generateContent } = require('./contentGenerator');
const { generateImage } = require('./imageGenerator');
const { postToFacebook } = require('./facebookPoster');
const { saveLog } = require('./logger');

const DELAY_BETWEEN_PAGES_MS = 10000; // 10 seconds

/**
 * Sleep helper.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process a single Facebook page: fetch news, generate content + image, post, log.
 *
 * @param {{ name: string, pageId: string, accessToken: string, topics: string[], tone: string }} page
 */
async function processPage(page) {
  const { name, pageId, topics, tone } = page;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📄 Processing page: ${name}`);
  console.log(`${'─'.repeat(60)}`);

  let newsTitle = '';
  let headline = '';
  let caption = '';
  let hashtags = '';
  let imageUrl = null;
  let fbPostId = null;
  let status = 'failed';

  try {
    // Step 1: Fetch news
    console.log(`📰 Fetching news for: ${name}...`);
    const article = await fetchNews(topics);
    newsTitle = article.title;
    console.log(`   Found: "${newsTitle}"`);

    // Step 2: Generate content
    console.log('🧠 Generating content with Kie.ai...');
    const content = await generateContent(article, topics, tone);
    headline = content.headline;
    caption = content.caption;
    hashtags = content.hashtags;
    const imagePrompt = content.imagePrompt;
    console.log(`   Headline: "${headline}"`);

    // Step 3: Generate image
    console.log('🎨 Generating image... (polling)');
    imageUrl = await generateImage(imagePrompt);

    // Step 4: Post to Facebook
    console.log('📤 Posting to Facebook...');
    fbPostId = await postToFacebook(page, content, imageUrl);

    status = 'success';
  } catch (err) {
    console.error(`❌ Error processing "${name}": ${err.message}`);
    status = 'failed';
  }

  // Step 5: Log result (always, even on failure)
  await saveLog({
    pageName: name,
    pageId,
    newsTitle,
    headline,
    caption,
    hashtags,
    imageUrl,
    fbPostId,
    status
  });
}

/**
 * Run one full cycle across all configured pages.
 */
async function runCycle() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🚀 Starting post cycle — ${new Date().toISOString()}`);
  console.log(`   Pages to process: ${pages.length}`);
  console.log(`${'═'.repeat(60)}`);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    await processPage(page);

    // Delay between pages to avoid rate limits (skip after last page)
    if (i < pages.length - 1) {
      console.log(`\n⏳ Waiting ${DELAY_BETWEEN_PAGES_MS / 1000}s before next page...`);
      await sleep(DELAY_BETWEEN_PAGES_MS);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ Cycle complete — ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(60)}\n`);
}

// ─── Cron Schedule ───────────────────────────────────────────────────────────
// Runs every 6 hours: at 00:00, 06:00, 12:00, 18:00
const CRON_SCHEDULE = '0 */6 * * *';

cron.schedule(CRON_SCHEDULE, () => {
  runCycle().catch((err) => {
    console.error('❌ Unhandled error in cron cycle:', err.message);
  });
});

console.log(`⏰ Cron job scheduled: every 6 hours (${CRON_SCHEDULE})`);

// ─── Immediate Run on Startup ─────────────────────────────────────────────────
console.log('▶️  Running immediate startup cycle...\n');
runCycle().catch((err) => {
  console.error('❌ Unhandled error in startup cycle:', err.message);
});
