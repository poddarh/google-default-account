const SERVICES = {
  Meet:    { filters: [{ hostEquals: 'meet.google.com' }],   mode: 'authuser' },
  Photo:   { filters: [{ urlMatches: 'photos.google.com/$' }], mode: 'path', dest: 'https://photos.google.com/u/' },
  Mail:    { filters: [{ urlMatches: 'mail.google.com/$' }, { hostEquals: 'gmail.com' }], mode: 'path', dest: 'https://mail.google.com/mail/u/' },
  Drive:   { filters: [{ urlMatches: 'drive.google.com/$' }], mode: 'path', dest: 'https://drive.google.com/drive/u/' },
  Youtube: { filters: [{ hostEquals: 'www.youtube.com' }],   mode: 'authuser' },
  Maps:    { filters: [{ hostEquals: 'maps.google.com' }, { hostEquals: 'www.google.com', urlMatches: '/maps' }],   mode: 'authuser' },
  Chat:    { filters: [{ urlMatches: 'chat.google.com/$' }], mode: 'path', dest: 'https://chat.google.com/u/' },
};

async function getDefaultAcct(name) {
  const cfg = await chrome.storage.local.get(name);
  return cfg[name] ?? '0';
}

// Services using ?authuser= parameter
for (const [name, svc] of Object.entries(SERVICES).filter(([, s]) => s.mode === 'authuser')) {
  chrome.webNavigation.onBeforeNavigate.addListener(
    async ({ tabId, frameId, url }) => {
      if (frameId !== 0) return;
      if (/authuser=\d+/.test(url) || /\/embed/.test(url)) return;
      const acct = await getDefaultAcct(name);
      if (acct === '0') return;
      const sep = url.includes('?') ? '&' : '?';
      const dest = `${url}${sep}authuser=${acct}`;
      console.info(`Redirected from ${url} to ${dest}`);
      chrome.tabs.update(tabId, { url: dest });
    },
    { url: svc.filters },
  );
}

// Services using /u/{index}/ path
for (const [name, svc] of Object.entries(SERVICES).filter(([, s]) => s.mode === 'path')) {
  chrome.webNavigation.onBeforeNavigate.addListener(
    async ({ tabId, frameId, url }) => {
      if (frameId !== 0) return;
      const acct = await getDefaultAcct(name);
      if (acct === '0') return;
      const dest = `${svc.dest}${acct}/`;
      console.info(`Redirected from ${url} to ${dest}`);
      chrome.tabs.update(tabId, { url: dest });
    },
    { url: svc.filters },
  );
}

// Optional: rewrite deep chat.google.com links (rooms, DMs, threads) to default account
chrome.webNavigation.onBeforeNavigate.addListener(
  async ({ tabId, frameId, url }) => {
    if (frameId !== 0) return;
    const cfg = await chrome.storage.local.get(['Chat', 'ChatDeepLink']);
    if (!cfg.ChatDeepLink) return;
    const acct = cfg.Chat ?? '0';
    if (acct === '0') return;
    const u = new URL(url);
    if (u.pathname === '/' || /^\/u\/\d+\//.test(u.pathname)) return;
    const dest = `https://chat.google.com/u/${acct}${u.pathname}${u.search}${u.hash}`;
    console.info(`Redirected from ${url} to ${dest}`);
    chrome.tabs.update(tabId, { url: dest });
  },
  { url: [{ hostEquals: 'chat.google.com' }] },
);

// Calendar: rewrite both root and deep links (/calendar/u/N/...) to default account
chrome.webNavigation.onBeforeNavigate.addListener(
  async ({ tabId, frameId, url }) => {
    if (frameId !== 0) return;
    const acct = await getDefaultAcct('Calendar');
    if (acct === '0') return;
    const u = new URL(url);
    const deepMatch = u.pathname.match(/^\/calendar\/u\/(\d+)(\/.*)?$/);
    if (deepMatch) {
      if (deepMatch[1] === acct) return;
      const rest = deepMatch[2] ?? '/';
      const dest = `https://calendar.google.com/calendar/u/${acct}${rest}${u.search}${u.hash}`;
      console.info(`Redirected from ${url} to ${dest}`);
      chrome.tabs.update(tabId, { url: dest });
      return;
    }
    if (u.pathname === '/' || u.pathname === '/calendar' || u.pathname === '/calendar/') {
      const dest = `https://calendar.google.com/calendar/u/${acct}/r`;
      console.info(`Redirected from ${url} to ${dest}`);
      chrome.tabs.update(tabId, { url: dest });
    }
  },
  { url: [{ hostEquals: 'calendar.google.com' }] },
);
