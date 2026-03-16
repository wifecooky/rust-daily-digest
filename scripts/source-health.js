import fs from 'fs/promises';
import yaml from 'js-yaml';

const CONSECUTIVE_FAILURE_THRESHOLD = 3;
const HEALTH_LOG_PATH = 'logs/source-health.json';
const CONFIG_PATH = 'site.yaml';

async function checkSource(src) {
  const start = Date.now();
  try {
    const res = await fetch(src.url, {
      headers: { 'User-Agent': 'SourceHealthCheck/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    const ms = Date.now() - start;
    if (!res.ok) return { name: src.name, url: src.url, ok: false, detail: `HTTP ${res.status}`, ms };
    const text = await res.text();
    const items = (text.match(/<item[\s>]/g) || text.match(/<entry[\s>]/g) || []).length;
    return { name: src.name, url: src.url, ok: true, detail: `${items} items`, ms };
  } catch (e) {
    return { name: src.name, url: src.url, ok: false, detail: e.message, ms: Date.now() - start };
  }
}

async function loadHealthLog() {
  try {
    return JSON.parse(await fs.readFile(HEALTH_LOG_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

async function main() {
  const configText = await fs.readFile(CONFIG_PATH, 'utf-8');
  const config = yaml.load(configText);
  const sources = config.sources.rss || [];

  console.log(`# Source Health Report — ${new Date().toISOString().split('T')[0]}\n`);

  const results = await Promise.all(sources.map(checkSource));
  const healthLog = await loadHealthLog();
  const toRemove = [];

  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.name.padEnd(30)} ${r.detail} (${r.ms}ms)`);

    const prev = healthLog[r.url] || { consecutiveFailures: 0 };
    if (r.ok) {
      healthLog[r.url] = { consecutiveFailures: 0, lastChecked: new Date().toISOString() };
    } else {
      const failures = prev.consecutiveFailures + 1;
      healthLog[r.url] = { consecutiveFailures: failures, lastChecked: new Date().toISOString(), lastError: r.detail };
      if (failures >= CONSECUTIVE_FAILURE_THRESHOLD) {
        toRemove.push({ name: r.name, url: r.url, failures });
      }
    }
  }

  // Check HN API
  try {
    const hn = config.sources.hackernews;
    if (hn?.enabled) {
      const q = encodeURIComponent(hn.query || 'AI');
      const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${q}&tags=story&hitsPerPage=5`);
      const data = await res.json();
      console.log(`\n✅ HN API: ${data.hits?.length || 0} hits for "${hn.query}"`);
    }
  } catch (e) {
    console.log(`\n❌ HN API: ${e.message}`);
  }

  const ok = results.filter(r => r.ok).length;
  console.log(`\nSummary: ${ok}/${results.length} sources healthy`);

  // Remove sources that failed 3+ consecutive weeks
  if (toRemove.length > 0) {
    console.log(`\n⚠️  Removing ${toRemove.length} source(s) after ${CONSECUTIVE_FAILURE_THRESHOLD}+ consecutive failures:`);
    const removeUrls = new Set(toRemove.map(s => s.url));
    for (const s of toRemove) {
      console.log(`   - ${s.name} (${s.failures} consecutive failures: ${healthLog[s.url].lastError})`);
      delete healthLog[s.url];
    }

    config.sources.rss = sources.filter(s => !removeUrls.has(s.url));
    await fs.writeFile(CONFIG_PATH, yaml.dump(config, { lineWidth: -1, quotingType: "'", forceQuotes: false }));
    console.log(`\n✅ Updated ${CONFIG_PATH}`);
  }

  await fs.mkdir('logs', { recursive: true });
  await fs.writeFile(HEALTH_LOG_PATH, JSON.stringify(healthLog, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
