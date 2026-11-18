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

const app = document.getElementById('app')!;

let currentScreen = '';

/** Swap screens. Redrawing the screen already shown (e.g. after a tap) keeps the scroll position. */
function show(name: string, el: HTMLElement): void {
  const same = name === currentScreen;
  const y = same ? window.scrollY : 0;
  currentScreen = name;
  if (!same) document.querySelector('.toast')?.remove();
  app.replaceChildren(el);
  window.scrollTo(0, y);
}

nav.home = () => show('home', homeScreen());
nav.study = (items) => show('study', studyScreen(items));
nav.stats = () => show('stats', statsScreen());
nav.settings = () => show('settings', settingsScreen());

async function init(): Promise<void> {
  await loadState();
  document.documentElement.lang = state.settings.lang;
  nav.home();
  registerSW({ immediate: true });
}

void init();
