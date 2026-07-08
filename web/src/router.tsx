import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { HomeScreen } from "./screens/HomeScreen";
import { CatalogScreen } from "./screens/CatalogScreen";
import { CoffeeDetailScreen } from "./screens/CoffeeDetailScreen";
import { EditCoffeeScreen } from "./screens/EditCoffeeScreen";
import { RecipeEditorScreen } from "./screens/RecipeEditorScreen";
import { NewCoffeeWizard } from "./screens/NewCoffeeWizard";
import { ScanScreen } from "./screens/ScanScreen";
import { LabelsScreen } from "./screens/LabelsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomeScreen /> },
      { path: "/catalog", element: <CatalogScreen /> },
      { path: "/catalog/new", element: <NewCoffeeWizard /> },
      { path: "/catalog/:id", element: <CoffeeDetailScreen /> },
      { path: "/catalog/:id/edit", element: <EditCoffeeScreen /> },
      { path: "/catalog/:id/recipe", element: <RecipeEditorScreen /> },
      { path: "/scan", element: <ScanScreen /> },
      { path: "/labels", element: <LabelsScreen /> },
      { path: "/settings", element: <SettingsScreen /> },
    ],
  },
]);
