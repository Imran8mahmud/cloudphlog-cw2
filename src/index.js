import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

// Initialize Application Insights if connection string is provided
if (process.env.REACT_APP_AI_CONNECTION_STRING) {
  const appInsights = new ApplicationInsights({
    config: {
      connectionString: process.env.REACT_APP_AI_CONNECTION_STRING,
      enableAutoRouteTracking: true,
      disableFetchTracking: false,
    }
  });
  appInsights.loadAppInsights();
  appInsights.trackPageView();
  window.appInsights = appInsights;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);