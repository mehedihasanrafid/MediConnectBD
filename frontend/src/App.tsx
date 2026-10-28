/**
 * Application root component delegating routing and layouts to AppRouter,
 * wrapped in global application providers (Toast notification system).
 */

import { ToastProvider } from "./components/ui";
import { AppRouter } from "./routes/AppRouter";

export default function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}
