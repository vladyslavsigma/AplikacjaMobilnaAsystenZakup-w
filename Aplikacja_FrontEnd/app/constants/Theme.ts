export const themes = {
    light: {
        name: 'Jasny',
        colors: {
            primary: '#3498db',
            background: '#f8f9fa',
            card: '#ffffff',
            text: '#2c3e50',
            textSecondary: '#7f8c8d',
            border: '#ecf0f1',
            success: '#2ecc71',
            warning: '#f39c12',
            danger: '#e74c3c',
            info: '#9b59b6',
            disabled: '#bdc3c7',
        },
        fontSize: {
            small: 12,
            medium: 16,
            large: 20,
            xlarge: 24,
            xxlarge: 32,
        },
    },
    highContrast: {
        name: 'Wysoki kontrast',
        colors: {
            primary: '#000000',
            background: '#ffffff',
            card: '#ffffff',
            text: '#000000',
            textSecondary: '#000000',
            border: '#000000',
            success: '#008000',
            warning: '#ffa500',
            danger: '#ff0000',
            info: '#0000ff',
            disabled: '#808080',
        },
        fontSize: {
            small: 14,
            medium: 18,
            large: 22,
            xlarge: 26,
            xxlarge: 34,
        },
    },
};

export type ThemeName = 'light' | 'highContrast';
export type Theme = typeof themes.light;