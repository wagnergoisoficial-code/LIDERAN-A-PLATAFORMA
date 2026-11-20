import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';

// UIkit só para os avisos (UIkit.notification) e o indicador de carregamento (uk-spinner);
// os ícones são os de components/Icon.tsx
import 'uikit';

export default function Root() {
  return (
    <StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>
  );
}
