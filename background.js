const SERVICES = [
  {
    name: 'Meet',
    mode: 'authuser',
    filters: [{ hostEquals: 'meet.google.com' }],
    isRoot: u => u.pathname === '/' || u.pathname === '',
  },
  {
    name: 'Photo',
    mode: 'path',
    filters: [{ hostEquals: 'photos.google.com' }],
    pathPattern: /^\/u\/(\d+)\//,
    rootDest: 'https://photos.google.com/u/{n}/',
    isRoot: u => u.pathname === '/' || u.pathname === '',
  },
  {
    name: 'Mail',
    mode: 'path',
    filters: [{ hostEquals: 'mail.google.com' }, { hostEquals: 'gmail.com' }],
    pathPattern: /^\/mail\/u\/(\d+)\//,
    rootDest: 'https://mail.google.com/mail/u/{n}/',
    isRoot: u => u.hostname === 'gmail.com' || /^\/(mail\/?)?$/.test(u.pathname),
  },
  {
    name: 'Drive',
    mode: 'path',
    filters: [{ hostEquals: 'drive.google.com' }],
    pathPattern: /^\/drive\/u\/(\d+)\//,
    rootDest: 'https://drive.google.com/drive/u/{n}/',
    isRoot: u => /^\/(drive\/?)?$/.test(u.pathname),
  },
  {
    name: 'Youtube',
    mode: 'authuser',
    filters: [{ hostEquals: 'www.youtube.com' }],
    isRoot: u => u.pathname === '/' || u.pathname === '',
  },
  {
    name: 'Chat',
    mode: 'path',
    filters: [{ hostEquals: 'chat.google.com' }],
    pathPattern: /^\/u\/(\d+)\//,
    rootDest: 'https://chat.google.com/u/{n}/',
    deepInjectPrefix: '/u/{n}',
    isRoot: u => u.pathname === '/' || u.pathname === '',
  },
  {
    name: 'Maps',
    mode: 'authuser',
    filters: [
      { hostEquals: 'maps.google.com' },
      { hostEquals: 'www.google.com', urlMatches: '/maps' },
    ],
    isRoot: u =>
      u.hostname === 'maps.google.com'
        ? u.pathname === '/' || u.pathname === ''
        : /^\/maps\/?$/.test(u.pathname),
  },
  {
    name: 'Calendar',
    mode: 'path',
    filters: [{ hostEquals: 'calendar.google.com' }],
    pathPattern: /^\/calendar\/u\/(\d+)(\/.*)?$/,
    rootDest: 'https://calendar.google.com/calendar/u/{n}/r',
    isRoot: u => /^\/(calendar\/?)?$/.test(u.pathname),
  },
];

function applyAuthuser(url, acct) {
  if (/[?&]authuser=\d+/.test(url)) {
    return url.replace(/([?&])authuser=\d+/, `$1authuser=${acct}`);
  }
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}authuser=${acct}`;
}

for (const svc of SERVICES) {
  chrome.webNavigation.onBeforeNavigate.addListener(
    async ({ tabId, frameId, url }) => {
      if (frameId !== 0) return;
      if (/\/embed/.test(url)) return;

      const cfg = await chrome.storage.local.get([svc.name, `${svc.name}DeepLink`]);
      const acct = cfg[svc.name];
      if (acct == null || acct === '0') return;

      // Default deep-link rewriting to ON when the user has set an account.
      // Explicit `false` opts out.
      const deepEnabled = cfg[`${svc.name}DeepLink`] !== false;

      const u = new URL(url);
      const isRoot = svc.isRoot(u);

      // --- Root redirect: always when account is configured ---
      if (isRoot) {
        let dest;
        if (svc.mode === 'authuser') {
          dest = applyAuthuser(url, acct);
        } else {
          dest = svc.rootDest.replace('{n}', acct);
        }
        if (dest === url) return;
        console.info(`[${svc.name}] root → ${dest}`);
        chrome.tabs.update(tabId, { url: dest });
        return;
      }

      // --- Deep redirect: only when toggle is on ---
      if (!deepEnabled) return;

      if (svc.mode === 'authuser') {
        const params = new URLSearchParams(u.search);
        if (params.get('authuser') === acct) return;
        const dest = applyAuthuser(url, acct);
        console.info(`[${svc.name}] deep → ${dest}`);
        chrome.tabs.update(tabId, { url: dest });
        return;
      }

      // path mode
      const m = u.pathname.match(svc.pathPattern);
      if (m) {
        if (m[1] === acct) return;
        const newPath = u.pathname.replace(/\/u\/\d+\//, `/u/${acct}/`);
        const dest = `${u.origin}${newPath}${u.search}${u.hash}`;
        console.info(`[${svc.name}] deep → ${dest}`);
        chrome.tabs.update(tabId, { url: dest });
        return;
      }

      if (svc.deepInjectPrefix) {
        const prefix = svc.deepInjectPrefix.replace('{n}', acct);
        const dest = `${u.origin}${prefix}${u.pathname}${u.search}${u.hash}`;
        console.info(`[${svc.name}] deep (inject) → ${dest}`);
        chrome.tabs.update(tabId, { url: dest });
      }
    },
    { url: svc.filters },
  );
}
