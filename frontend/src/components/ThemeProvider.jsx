import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Default to dark mode for trading platform
    const saved = window.localStorage.getItem('trado-theme');
    if (saved) return saved;
    return 'dark'; // 'dark' | 'light'
  });

  useEffect(() => {
    window.localStorage.setItem('trado-theme', theme);
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${theme}`);
    
    // Smooth transition effect when toggling
    document.body.style.transition = 'background-color 0.4s ease, color 0.4s ease';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
