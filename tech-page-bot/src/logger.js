const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs');

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}_${hh}-${min}`;
}

function sanitizePageName(name) {
  return name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
}

async function saveLog({
  pageName,
  pageId,
  newsTitle,
  headline,
  caption,
  hashtags,
  imageUrl,
  fbPostId,
  status
}) {
  ensureLogsDir();

  const now = new Date();
  const timestamp = now.toISOString();
  const fileTimestamp = formatTimestamp(now);
  const safeName = sanitizePageName(pageName);
  const filename = `${fileTimestamp}_${safeName}.json`;
  const filepath = path.join(LOGS_DIR, filename);

  const logEntry = {
    timestamp,
    pageName,
    pageId,
    newsTitle,
    headline,
    caption,
    hashtags,
    imageUrl,
    fbPostId,
    status
  };

  fs.writeFileSync(filepath, JSON.stringify(logEntry, null, 2), 'utf-8');

  const statusIcon = status === 'success' ? '✅' : '❌';
  console.log(`\n${statusIcon} Log saved: ${filename}`);
  console.log(`   Page     : ${pageName}`);
  console.log(`   News     : ${newsTitle}`);
  console.log(`   Headline : ${headline}`);
  console.log(`   FB Post  : ${fbPostId || 'N/A'}`);
  console.log(`   Status   : ${status}\n`);

  return filepath;
}

module.exports = { saveLog };
