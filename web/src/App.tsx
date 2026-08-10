import { Suspense, useEffect } from "react";
import { useRoutes } from "react-router-dom";
import { App as AntApp } from "antd";
import { Guard } from "./routes/Guard";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { VersionUpdateBar } from "./components/common/VersionUpdateBar";
import { PageSkeleton } from "./components/common/PageSkeleton";
import { routes } from "./routes/routes";
import { useAppStore } from "./stores";

function App() {
  const element = useRoutes(routes);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "app-settings") {
        useAppStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <AntApp>
      <Guard>
        <ErrorBoundary>
          <VersionUpdateBar />
          <Suspense fallback={<PageSkeleton type="table" />}>
            {element}
          </Suspense>
        </ErrorBoundary>
      </Guard>
    </AntApp>
  );
}

export default App;
