import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { HomeScreen } from "./screens/HomeScreen";
import { CatalogScreen } from "./screens/CatalogScreen";
import { ScanScreen } from "./screens/ScanScreen";
import { LabelsScreen } from "./screens/LabelsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomeScreen /> },
      { path: "/catalog", element: <CatalogScreen /> },
      { path: "/scan", element: <ScanScreen /> },
      { path: "/labels", element: <LabelsScreen /> },
      { path: "/settings", element: <SettingsScreen /> },
    ],
  },
]);
