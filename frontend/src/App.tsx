import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IMUDashboard } from './features/imu/IMUDashboard';
import { LoginButton } from './features/auth/LoginButton';
import { SiCoffeescript } from 'react-icons/si';

const queryClient = new QueryClient();

function App() {
  const appIdentifier = encodeURIComponent(window.location.hostname || 'imu-dashboard');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">IMU Sensor Dashboard</h1>
            <LoginButton />
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8">
          <IMUDashboard />
        </main>

        <footer className="border-t border-border bg-card py-6 mt-12">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              Built with <SiCoffeescript className="text-accent w-4 h-4" /> using{' '}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appIdentifier}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                caffeine.ai
              </a>
            </p>
            <p className="mt-2">© {new Date().getFullYear()} IMU Sensor Dashboard</p>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;
