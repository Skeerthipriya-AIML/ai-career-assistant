import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/80 transition-all duration-300"
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <Moon size={18} className="text-slate-700 dark:text-slate-300 hover:rotate-12 transition-transform duration-300" />
      ) : (
        <Sun size={18} className="text-amber-400 hover:rotate-45 transition-transform duration-300" />
      )}
    </button>
  );
};
