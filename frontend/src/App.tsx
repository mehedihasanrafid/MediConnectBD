/**
 * Application root component delegating routing and layouts to AppRouter,
 * wrapped in global application providers (Toast notification system).
 */

import { ErrorBoundary, ToastProvider } from "./shared/ui";
import { ThemeProvider } from "./shared/theme";
import { NotificationProvider } from "./notifications";
import { AppRouter } from "./routes/AppRouter";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <NotificationProvider>
            <AppRouter />
          </NotificationProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
