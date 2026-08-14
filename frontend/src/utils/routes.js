export const APP_TABS = [
  { id: 'dashboard', path: '/dashboard' },
  { id: 'transactions', path: '/transactions' },
  { id: 'ai-coach', path: '/advisor' },
  { id: 'budgets', path: '/budgets' },
  { id: 'goals', path: '/goals' },
  { id: 'recurring', path: '/recurring' },
  { id: 'wrap', path: '/wrap' }
];

const pathToTab = Object.fromEntries(APP_TABS.map((t) => [t.path, t.id]));
const tabToPath = Object.fromEntries(APP_TABS.map((t) => [t.id, t.path]));

export function tabFromPath(pathname) {
  return pathToTab[pathname] || null;
}

export function pathFromTab(tab) {
  return tabToPath[tab] || '/dashboard';
}

export function isPublicPath(pathname) {
  return pathname === '/' || pathname === '/login' || pathname === '/signup';
}
