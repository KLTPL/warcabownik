import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { I18nProvider } from "./context/I18nContext";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Auth } from "./pages/Auth";
import { Game } from "./pages/Game";
import { GameHistory } from "./pages/GameHistory";
import { OAuthSuccess } from "./pages/OAuthSuccess";

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="auth" element={<Auth />} />
                <Route path="oauth-success" element={<OAuthSuccess />} />
                <Route path="game/:id" element={<Game />} />
                <Route path="history" element={<GameHistory />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
