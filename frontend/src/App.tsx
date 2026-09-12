import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./assets/pages/Home";
import { Auth } from "./assets/pages/Auth";
import { Game } from "./assets/pages/Game";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="auth" element={<Auth />} />
          <Route path="game/:id" element={<Game />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
