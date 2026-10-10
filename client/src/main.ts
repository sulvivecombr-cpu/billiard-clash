import './ui/styles.css';
import type { Difficulty, MatchState } from '@pool/shared';
import { loadSettings, type GameSettings } from './utils/settings';
import { SoundManager } from './audio/SoundManager';
import { renderMainMenu } from './ui/screens/MainMenu';
import { renderComputerMenu } from './ui/screens/ComputerMenu';
import { renderOnlineMenu } from './ui/screens/OnlineMenu';
import { renderProfile } from './ui/screens/ProfileScreen';
import { renderTokenStore } from './ui/screens/TokenStore';
import { renderHowToPlay } from './ui/screens/HowToPlay';
import { renderSettings } from './ui/screens/Settings';
import { confirmCheckout } from './utils/tokens';
import { GameScreen } from './game/GameScreen';
import { VsComputerSession } from './game/VsComputerSession';
import { OnlineSession } from './game/OnlineSession';

const app = document.getElementById('app')!;
let settings: GameSettings = loadSettings();
const sound = new SoundManager(settings);
let activeGameScreen: GameScreen | null = null;

function teardownGame(): void {
  if (activeGameScreen) {
    activeGameScreen.destroy();
    activeGameScreen = null;
  }
}

function showMainMenu(): void {
  teardownGame();
  renderMainMenu(app, {
    onPlayOnline: showOnlineMenu,
    onPlayComputer: showComputerMenu,
    onProfile: showProfile,
    onStore: () => showTokenStore(),
    onHowToPlay: showHowToPlay,
    onSettings: showSettings,
  });
}

function showComputerMenu(): void {
  renderComputerMenu(app, settings.playerName, {
    onBack: showMainMenu,
    onStart: (playerName: string, difficulty: Difficulty) => {
      settings.playerName = playerName;
      const session = new VsComputerSession(playerName, difficulty);
      launchGame(session);
    },
  });
}

function showOnlineMenu(): void {
  renderOnlineMenu(app, settings.playerName, {
    onBack: showMainMenu,
    onMatchReady: (roomCode: string, playerId: string, state: MatchState) => {
      const session = new OnlineSession(roomCode, playerId, state);
      launchGame(session);
    },
  });
}

function showProfile(): void {
  renderProfile(app, { onBack: showMainMenu, onOpenStore: () => showTokenStore() });
}

function showTokenStore(notice?: string): void {
  teardownGame();
  renderTokenStore(app, { onBack: showMainMenu, notice });
}

function showHowToPlay(): void {
  renderHowToPlay(app, showMainMenu);
}

function showSettings(): void {
  renderSettings(
    app,
    settings,
    (updated) => {
      settings = updated;
      sound.updateSettings(settings);
    },
    showMainMenu
  );
}

function launchGame(session: VsComputerSession | OnlineSession): void {
  teardownGame();
  activeGameScreen = new GameScreen(app, session, sound, settings, {
    onExitToMenu: showMainMenu,
  });
}

/** Handles the return from Stripe Checkout (?checkout=success&session_id=…). */
async function boot(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  if (params.get('checkout') === 'success' && params.get('session_id')) {
    const sessionId = params.get('session_id')!;
    window.history.replaceState({}, '', window.location.pathname);
    let notice: string;
    try {
      const { credited } = await confirmCheckout(sessionId);
      notice = credited > 0 ? `Compra concluída! +${credited} fichas adicionadas.` : 'Sua compra já havia sido processada.';
    } catch (e) {
      notice = e instanceof Error ? e.message : 'Não foi possível confirmar a compra.';
    }
    showTokenStore(notice);
    return;
  }
  showMainMenu();
}

void boot();
