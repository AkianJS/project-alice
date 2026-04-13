import { createSignal, onMount, Show } from 'solid-js';
import './styles/theme.css';
import './styles/global.css';
import './styles/panels.css';
import { listen } from '@tauri-apps/api/event';
import { getLastProject, openProject } from './lib/tauri';
import ProjectPicker from './components/project/ProjectPicker';
import AppLayout from './components/layout/AppLayout';
import ToastContainer from './components/shared/Toast';

const App = () => {
  const [projectPath, setProjectPath] = createSignal<string | null>(null);
  const [staleError, setStaleError] = createSignal<string | undefined>(undefined);
  const [ready, setReady] = createSignal(false);
  const [fatalError, setFatalError] = createSignal<string | null>(null);
  const [showProjectPicker, setShowProjectPicker] = createSignal(false);

  onMount(async () => {
    // Log unhandled promise rejections for diagnostics.
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[unhandledrejection]', event.reason);
    });

    // Listen for the File → Open Project menu event from the backend.
    listen('menu-open-project', () => {
      setShowProjectPicker(true);
    }).catch((err) => {
      console.warn('Failed to register menu-open-project listener:', err);
    });

    try {
      const last = await getLastProject();
      if (last) {
        await openProject(last);
        setProjectPath(last);
      } else {
        setProjectPath(null);
      }
    } catch (err) {
      // Distinguish a truly fatal database error from a stale-project error.
      const msg = typeof err === 'string' ? err : String(err);
      if (msg.toLowerCase().includes('database') || msg.toLowerCase().includes('sqlite')) {
        setFatalError(`Database unavailable: ${msg}`);
        return;
      }
      setStaleError('The previous project could not be opened. Please select a repository.');
    } finally {
      setReady(true);
    }
  });

  const handleSelect = async (path: string) => {
    try {
      await openProject(path);
      setStaleError(undefined);
      setProjectPath(path);
      setShowProjectPicker(false);
    } catch (err) {
      setStaleError(typeof err === 'string' ? err : 'Failed to open project.');
    }
  };

  return (
    <div class="app">
      <Show
        when={!fatalError()}
        fallback={
          <div class="fatal-error-screen" style={{
            display: 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
            'justify-content': 'center',
            height: '100vh',
            padding: '2rem',
            'text-align': 'center',
            color: 'var(--color-error, #ef4444)',
          }}>
            <h1 style={{ 'font-size': '1.5rem', 'margin-bottom': '1rem' }}>
              Alice failed to start
            </h1>
            <p style={{ 'max-width': '480px', color: 'var(--color-text-secondary)' }}>
              {fatalError()}
            </p>
          </div>
        }
      >
        <Show when={ready()}>
          <Show
            when={projectPath() && !showProjectPicker()}
            fallback={
              <ProjectPicker
                onSelect={handleSelect}
                errorMessage={staleError()}
              />
            }
          >
            <AppLayout />
          </Show>
        </Show>
      </Show>
      <ToastContainer />
    </div>
  );
};

export default App;
