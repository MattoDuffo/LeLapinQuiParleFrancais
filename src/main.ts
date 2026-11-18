import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import './styles.css';
import { loadState, state } from './store';
import { homeScreen } from './ui/home';
import { nav } from './ui/nav';
import { settingsScreen } from './ui/settings';
import { statsScreen } from './ui/stats';
import { studyScreen } from './ui/study';
import { cardScreen, categoryScreen } from './ui/words';

const app = document.getElementById('app')!;

let currentScreen = '';
/** Scroll position of each screen we left, to restore when coming back to it from a screen it opened. */
const scrollMemory = new Map<string, number>();
const PARENT: Record<string, string> = { category: 'stats', card: 'category' };
const kind = (name: string) => name.split(':')[0];

/**
 * Swap screens. Redrawing the screen already shown (e.g. after a tap) keeps the scroll
 * position; going back from a word to its list (or a list to the stats) returns to where you were.
 */
function show(name: string, el: HTMLElement): void {
  const same = name === currentScreen;
  const back = PARENT[kind(currentScreen)] === kind(name);
  if (currentScreen) scrollMemory.set(currentScreen, window.scrollY);
  const y = same ? window.scrollY : back ? (scrollMemory.get(name) ?? 0) : 0;
  currentScreen = name;
  if (!same) document.querySelector('.toast')?.remove();
  app.replaceChildren(el);
  window.scrollTo(0, y);
}

nav.home = () => show('home', homeScreen());
nav.study = (items) => show('study', studyScreen(items));
nav.stats = () => show('stats', statsScreen());
nav.settings = () => show('settings', settingsScreen());
nav.category = (category) => show(`category:${category}`, categoryScreen(category));
nav.card = (cardId) => show(`card:${cardId}`, cardScreen(cardId));

async function init(): Promise<void> {
  await loadState();
  document.documentElement.lang = state.settings.lang;
  nav.home();
  registerSW({ immediate: true });
}

void init();
