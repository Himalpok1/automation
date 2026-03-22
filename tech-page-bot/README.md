# tech-page-bot

An automated Node.js bot that fetches trending tech news, generates AI-written content and images using [Kie.ai](https://kie.ai), and publishes unique posts to multiple Facebook pages every 6 hours.

---

## Features

- Fetches top technology headlines from [NewsAPI](https://newsapi.org)
- Generates a headline, caption, hashtags, and image prompt tailored to each page's topics and tone using Kie.ai LLM
- Creates a matching image using Kie.ai's GPT-4o image generation (with async polling)
- Posts to multiple Facebook pages via the Meta Graph API
- Falls back gracefully at every step (text-only posts if image fails, hardcoded news if NewsAPI fails)
- Saves detailed JSON logs for every post attempt
- Runs on a 6-hour cron schedule with an immediate cycle on startup

---

## Prerequisites

- **Node.js 18+** — [Download here](https://nodejs.org)
- A [NewsAPI](https://newsapi.org/register) account and API key
- A [Kie.ai](https://kie.ai) account and API key
- One or more Facebook Pages with Page Access Tokens (via [Meta for Developers](https://developers.facebook.com))

---

## Installation

1. **Clone the repository and navigate into it:**

   ```bash
   git clone <your-repo-url>
   cd tech-page-bot
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   ```

   Open `.env` and fill in your API keys:

   ```env
   KIE_API_KEY=your_kie_api_key_here
   NEWS_API_KEY=your_newsapi_key_here
   ```

4. **Configure your Facebook pages** (see next section).

---

## Adding or Editing Facebook Pages

All pages are configured in `pages.config.js`. Each entry in the array represents one Facebook page.

```js
module.exports = [
  {
    name: "Tech Gadgets Page",           // Human-readable label (used in logs)
    pageId: "123456789",                 // Your Facebook Page ID
    accessToken: "EAABsbCS...",          // Facebook Page Access Token
    topics: ["gadgets", "smartphones"],  // Topics used to filter news
    tone: "fun, engaging, and casual"    // Influences the AI's writing style
  },
  // Add more pages here...
];
```

To add a new page, just add another object to the array. The bot will automatically include it in every posting cycle.

**How to get your Page ID and Access Token:**
1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create an app → add the **Pages API** product
3. Generate a Page Access Token with `pages_manage_posts` and `pages_read_engagement` permissions

---

## How to Run

```bash
npm start
```

The bot will:
1. Run one immediate posting cycle across all pages on startup
2. Schedule a recurring cycle every 6 hours (at 00:00, 06:00, 12:00, 18:00)

---

## Where Logs Are Saved

Every post attempt (success or failure) is saved to the `logs/` directory as a JSON file:

```
logs/
  2024-01-15_08-00_Tech-Gadgets-Page.json
  2024-01-15_08-00_AI-News-Page.json
  ...
```

Each log file contains:

```json
{
  "timestamp": "2024-01-15T08:00:00.000Z",
  "pageName": "Tech Gadgets Page",
  "pageId": "123456789",
  "newsTitle": "...",
  "headline": "...",
  "caption": "...",
  "hashtags": "...",
  "imageUrl": "https://...",
  "fbPostId": "123456789_987654321",
  "status": "success"
}
```

---

## Environment Variables

| Variable        | Required | Description                                              |
|-----------------|----------|----------------------------------------------------------|
| `KIE_API_KEY`   | Yes      | Your Kie.ai API key for LLM and image generation         |
| `NEWS_API_KEY`  | Yes      | Your NewsAPI.org key for fetching top tech headlines     |

Facebook credentials (Page ID and Access Token) are stored per-page in `pages.config.js`, not in `.env`, since each page has its own token.

---

## Project Structure

```
tech-page-bot/
├── src/
│   ├── index.js              ← Entry point + cron scheduler
│   ├── newsFetcher.js        ← Fetch trending tech news from NewsAPI
│   ├── contentGenerator.js   ← Kie.ai LLM: headline, caption, hashtags, image prompt
│   ├── imageGenerator.js     ← Kie.ai image generation with async polling
│   ├── facebookPoster.js     ← Post to Facebook via Meta Graph API
│   └── logger.js             ← Save post logs as JSON files
├── pages.config.js           ← Multi-page configuration array
├── .env.example              ← Template for environment variables
├── package.json
└── README.md
```

---

## Troubleshooting

- **"KIE_API_KEY is not set"** — Make sure your `.env` file exists and contains the key.
- **"Page ID not configured"** — Replace `REPLACE_WITH_PAGE_ID` in `pages.config.js` with your actual page ID.
- **Image generation times out** — The bot will automatically fall back to a text-only post. Check your Kie.ai account quota.
- **NewsAPI returns no articles** — The bot falls back to hardcoded tech topics automatically.
