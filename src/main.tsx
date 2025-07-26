// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />  {/* ✅ 渲染 App 组件 */}
  </React.StrictMode>
);
