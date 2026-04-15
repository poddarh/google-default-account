const SERVICES = {
  Meet:    { filters: [{ hostEquals: 'meet.google.com' }],   mode: 'authuser' },
  Photo:   { filters: [{ urlMatches: 'photos.google.com/$' }], mode: 'path', dest: 'https://photos.google.com/u/' },
  Mail:    { filters: [{ urlMatches: 'mail.google.com/$' }, { hostEquals: 'gmail.com' }], mode: 'path', dest: 'https://mail.google.com/mail/u/' },
  Drive:   { filters: [{ urlMatches: 'drive.google.com/$' }], mode: 'path', dest: 'https://drive.google.com/drive/u/' },
  Youtube: { filters: [{ hostEquals: 'www.youtube.com' }],   mode: 'authuser' },
  Maps:    { filters: [{ hostEquals: 'maps.google.com' }],   mode: 'authuser' },
  Chat:    { filters: [{ urlMatches: 'chat.google.com/$' }], mode: 'path', dest: 'https://chat.google.com/u/' },
};

async function getDefaultAcct(name) {
  const cfg = await chrome.storage.local.get(name);
  return cfg[name] ?? '0';
}

// Services using ?authuser= parameter
for (const [name, svc] of Object.entries(SERVICES).filter(([, s]) => s.mode === 'authuser')) {
  chrome.webNavigation.onBeforeNavigate.addListener(
    async ({ tabId, url }) => {
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
    async ({ tabId, url }) => {
      const acct = await getDefaultAcct(name);
      if (acct === '0') return;
      const dest = `${svc.dest}${acct}/`;
      console.info(`Redirected from ${url} to ${dest}`);
      chrome.tabs.update(tabId, { url: dest });
    },
    { url: svc.filters },
  );
}
