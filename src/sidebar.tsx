import React, { useState } from 'react';

const PTTSelector: React.FC = () => {
  const [menuExpanded, setMenuExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'choice' | 'gemini'>('gemini');

  const menuItems = [
    { key: 'choice', label: 'CHOICE PTT' },
    { key: 'gemini', label: 'GEMINI PTT' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '200px',
          background: 'linear-gradient(to bottom, #182086, #D7D6F6, #182086)',
          color: '#fff',
          padding: '30px 20px',
        }}
      >
        {/* Clickable Header */}
        <h3
          onClick={() => setMenuExpanded(prev => !prev)}
          style={{
            marginBottom: menuExpanded ? '20px' : '10px',
            fontSize: '18px'
