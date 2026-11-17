import { registerSW } from 'virtual:pwa-register';
import './styles.css';
import { loadState, state } from './store';
import { homeScreen } from './ui/home';
import { nav } from './ui/nav';
import { settingsScreen } from './ui/settings';
import { statsScreen } from './ui/stats';
import { studyScreen } from './ui/study';

const app = document.getElementById('app')!;

function show(el: HTMLElement): void {
  document.querySelector('.toast')?.remove();
  app.replaceChildren(el);
  window.scrollTo(0, 0);
}

nav.home = () => show(homeScreen());
nav.study = (items) => show(studyScreen(items));
nav.stats = () => show(statsScreen());
nav.settings = () => show(settingsScreen());

async function init(): Promise<void> {
  await loadState();
  document.documentElement.lang = state.settings.lang;
  nav.home();
  registerSW({ immediate: true });
}

void init();
