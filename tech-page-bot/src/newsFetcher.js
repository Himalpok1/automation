const axios = require('axios');

const FALLBACK_TOPICS = [
  {
    title: "AI Breakthroughs Are Reshaping the Tech Industry in 2024",
    description: "Artificial intelligence continues to transform how we work, create, and communicate across every sector.",
    url: "https://example.com/ai-breakthroughs",
    source: "Tech Fallback"
  },
  {
    title: "Next-Gen Smartphones Introduce Revolutionary Camera Technology",
    description: "Leading manufacturers unveil devices with computational photography that rivals professional cameras.",
    url: "https://example.com/smartphones",
    source: "Tech Fallback"
  },
  {
    title: "Quantum Computing Reaches New Milestones in Error Correction",
    description: "Researchers achieve unprecedented stability in quantum processors, inching closer to practical applications.",
    url: "https://example.com/quantum",
    source: "Tech Fallback"
  },
  {
    title: "Electric Vehicles Now Outsell Traditional Cars in Several Markets",
    description: "EV adoption accelerates globally as battery range improves and charging infrastructure expands rapidly.",
    url: "https://example.com/evs",
    source: "Tech Fallback"
  },
  {
    title: "Open Source AI Models Challenge Commercial Giants",
    description: "Community-driven AI projects are closing the gap with proprietary models, democratizing access to advanced AI.",
    url: "https://example.com/open-source-ai",
    source: "Tech Fallback"
  }
];

/**
 * Score how relevant an article is to the page's topics.
 * Returns a numeric score — higher is more relevant.
 */
function scoreArticle(article, topics) {
  const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  return topics.reduce((score, topic) => {
    return score + (text.includes(topic.toLowerCase()) ? 1 : 0);
  }, 0);
}

/**
 * Fetch top tech headlines from NewsAPI and return the most relevant one
 * for the given page topics. Falls back to hardcoded topics on failure.
 *
 * @param {string[]} topics - Array of topic keywords for the page
 * @returns {Promise<{ title: string, description: string, url: string, source: string }>}
 */
async function fetchNews(topics) {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    console.warn('⚠️  NEWS_API_KEY not set — using fallback topics');
    return pickFallback(topics);
  }

  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        category: 'technology',
        language: 'en',
        pageSize: 10,
        apiKey
      },
      timeout: 10000
    });

    const articles = (response.data.articles || []).filter(
      (a) => a.title && a.description
    );

    if (articles.length === 0) {
      console.warn('⚠️  No articles returned from NewsAPI — using fallback');
      return pickFallback(topics);
    }

    // Sort by relevance to page topics, pick the best match
    const scored = articles.map((a) => ({ article: a, score: scoreArticle(a, topics) }));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0].article;

    return {
      title: best.title,
      description: best.description || '',
      url: best.url || '',
      source: best.source?.name || 'NewsAPI'
    };
  } catch (err) {
    console.error('❌ NewsAPI error:', err.message);
    return pickFallback(topics);
  }
}

/**
 * Pick the most relevant fallback article based on topic keywords.
 */
function pickFallback(topics) {
  const scored = FALLBACK_TOPICS.map((a) => ({ article: a, score: scoreArticle(a, topics) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].article;
}

module.exports = { fetchNews };
