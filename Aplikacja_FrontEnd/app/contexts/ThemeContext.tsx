import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeName, themes } from '../constants/Theme';

interface ThemeContextType {
    theme: Theme;
    themeName: ThemeName;
    toggleTheme: (themeName: ThemeName) => void;
    isHighContrast: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [themeName, setThemeName] = useState<ThemeName>('light');
    const [theme, setTheme] = useState<Theme>(themes.light);

    useEffect(() => {
        loadTheme();
    }, []);

    useEffect(() => {
        setTheme(themes[themeName]);
        // Możemy dodać globalne style np. dla Text
    }, [themeName]);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('app-theme');
            if (savedTheme && (savedTheme === 'light' || savedTheme === 'highContrast')) {
                setThemeName(savedTheme);
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    };

    const toggleTheme = async (newThemeName: ThemeName) => {
        setThemeName(newThemeName);
        try {
            await AsyncStorage.setItem('app-theme', newThemeName);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    };

    const value = {
        theme,
        themeName,
        toggleTheme,
        isHighContrast: themeName === 'highContrast',
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};