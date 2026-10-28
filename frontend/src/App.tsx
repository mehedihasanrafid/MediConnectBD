/**
 * Application root component delegating routing and layouts to AppRouter,
 * wrapped in global application providers (Toast notification system).
 */

import { ErrorBoundary, ToastProvider } from "./shared/ui";
import { AppRouter } from "./routes/AppRouter";

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </ErrorBoundary>
  );
}
