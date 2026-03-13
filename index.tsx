import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { BrowserRouter as Router } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Router>
      <AppProvider>
        <App />
      </AppProvider>
    </Router>
  </React.StrictMode>
);
