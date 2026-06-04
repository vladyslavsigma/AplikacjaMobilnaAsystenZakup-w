import { useTheme } from '../contexts/ThemeContext';
import { StyleSheet } from 'react-native';

export const useThemeStyles = () => {
    const { theme, isHighContrast } = useTheme();

    const createStyles = (styles: any) => {
        return StyleSheet.create({
            ...styles,
            // Możemy dodać globalne style
            text: {
                color: theme.colors.text,
                fontSize: theme.fontSize.medium,
                fontWeight: isHighContrast ? 'bold' : 'normal',
            },
            container: {
                backgroundColor: theme.colors.background,
            },
            card: {
                backgroundColor: theme.colors.card,
                borderWidth: isHighContrast ? 2 : 0,
                borderColor: theme.colors.border,
            },
        });
    };

    return { theme, isHighContrast, createStyles };
};
