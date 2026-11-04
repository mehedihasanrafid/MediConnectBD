/**
 * Application root component delegating routing and layouts to AppRouter,
 * wrapped in global application providers (Toast notification system).
 */

import { ErrorBoundary, ToastProvider } from "./shared/ui";
import { ThemeProvider } from "./shared/theme";
import { NotificationProvider } from "./notifications";
import { PublicDemoNotice } from "./communication/components/PublicDemoNotice";
import { AppRouter } from "./routes/AppRouter";
import { useLocation } from "react-router-dom";
import { isPublicPage } from "./shared/navigation/PortalHeader/pageTitles";
import { CallProvider } from "./communication/calls/CallProvider";

export default function App() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary>
      <ThemeProvider publicPage={isPublicPage(pathname)}>
        <ToastProvider>
          <NotificationProvider>
            <CallProvider><PublicDemoNotice /><AppRouter /></CallProvider>
          </NotificationProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
