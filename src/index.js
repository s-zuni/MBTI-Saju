import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

console.log('index.js: Starting initialization...');
const rootElement = document.getElementById('root');
console.log('index.js: rootElement found:', !!rootElement);

const root = ReactDOM.createRoot(rootElement);
console.log('index.js: React root created');

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log('index.js: Render called');

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
