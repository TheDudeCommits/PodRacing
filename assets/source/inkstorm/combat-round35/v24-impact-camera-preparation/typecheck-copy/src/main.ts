import './styles.css';
import { GameApp } from './render/app/GameApp';

const mount = document.querySelector<HTMLDivElement>('#game');
if (!mount) throw new Error('Missing #game mount');

const app = new GameApp(mount);
app.start();

// Helpful during local iteration and harmless in production: context recovery is
// explicit and disposal remains reachable from browser diagnostics.
if (import.meta.hot) {
  import.meta.hot.dispose(() => app.dispose());
}
