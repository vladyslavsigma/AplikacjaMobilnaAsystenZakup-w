import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Link, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

import {API_BASE_URL} from "@/app/constants/Config";

export default function LoginScreen() {
    const { theme, isHighContrast } = useTheme(); // Dodaj tę linię
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);


    const styles = createStyles(theme, isHighContrast);

    const handleLogin = async () => {

        if (!email.trim() || !password) {
            Alert.alert('Błąd', 'Wprowadź email i hasło');
            return;
        }

        setLoading(true);
        try {
            console.log(`Próba logowania pod adres: ${API_BASE_URL}/auth/login`); //

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });


            if (response.ok) {

                const data = await response.json();

                await AsyncStorage.setItem('token', data.token || 'dummy-token');
                await AsyncStorage.setItem('username', data.username || 'Użytkownik');
                await AsyncStorage.setItem('email', data.email);

                Alert.alert('Sukces!', 'Zalogowano pomyślnie!');
                router.replace('/(tabs)');
            } else if (response.status === 400) {
                Alert.alert('Email or password are incorrect');
            }

            else {

                const errorText = await response.text();
                console.error('Błąd serwera (status ' + response.status + '):', errorText);

                Alert.alert(
                    'Błąd logowania',
                    `Serwer zwrócił błąd ${response.status}. Sprawdź konsolę, aby zobaczyć szczegóły.` +errorText
                );
            }
        } catch (error) {

            console.error('Login error (Network/CORS):', error);

            Alert.alert(
                'Błąd połączenia',
                'Nie udało się połączyć z serwerem. Upewnij się, że backend działa pod adresem: ' + API_BASE_URL
            );


            await AsyncStorage.setItem('token', 'offline-token');
            await AsyncStorage.setItem('username', 'Użytkownik Offline');
            await AsyncStorage.setItem('email', email);
            router.replace('/(tabs)');

        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <Icon name="shopping-cart" size={60} color={theme.colors.primary} />
                    <Text style={styles.title}>Asystent Zakupów</Text>
                    <Text style={styles.subtitle}>Zaloguj się do aplikacji</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputContainer}>
                        <Icon name="email" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="twoj@email.com"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!loading}
                        />
                    </View>

                    <Text style={styles.label}>Hasło</Text>
                    <View style={styles.inputContainer}>
                        <Icon name="lock" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Twoje hasło"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            editable={!loading}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                        >
                            <Icon
                                name={showPassword ? "visibility-off" : "visibility"}
                                size={20}
                                color={theme.colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Icon name="login" size={20} color="white" />
                                <Text style={styles.buttonText}>Zaloguj się</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>lub</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <Link href="/(auth)/register" asChild>
                        <TouchableOpacity style={styles.secondaryButton}>
                            <Icon name="person-add" size={20} color={theme.colors.primary} />
                            <Text style={styles.secondaryButtonText}>Utwórz nowe konto</Text>
                        </TouchableOpacity>
                    </Link>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Wersja 1.0.0</Text>
                        {isHighContrast && (
                            <Text style={styles.highContrastInfo}>Tryb wysokiego kontrastu</Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// Zamień static styles na dynamiczne
const createStyles = (theme: any, isHighContrast: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: isHighContrast ? theme.fontSize.xxlarge + 4 : theme.fontSize.xxlarge,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 15,
        marginBottom: 5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        fontWeight: isHighContrast ? '600' : 'normal',
    },
    form: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isHighContrast ? 0.3 : 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.border,
    },
    label: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
        marginLeft: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: isHighContrast ? 3 : 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        marginBottom: 20,
        backgroundColor: theme.colors.background,
    },
    inputIcon: {
        marginLeft: 15,
    },
    input: {
        flex: 1,
        padding: 15,
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.text,
    },
    eyeIcon: {
        padding: 15,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        borderRadius: 10,
        padding: isHighContrast ? 20 : 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        gap: 10,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.text,
    },
    buttonDisabled: {
        backgroundColor: theme.colors.disabled,
    },
    buttonText: {
        color: 'white',
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 25,
    },
    dividerLine: {
        flex: 1,
        height: isHighContrast ? 2 : 1,
        backgroundColor: theme.colors.border,
    },
    dividerText: {
        paddingHorizontal: 15,
        color: theme.colors.textSecondary,
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: isHighContrast ? '600' : 'normal',
    },
    secondaryButton: {
        flexDirection: 'row',
        borderWidth: isHighContrast ? 3 : 2,
        borderColor: theme.colors.primary,
        borderRadius: 10,
        padding: isHighContrast ? 18 : 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    secondaryButtonText: {
        color: theme.colors.primary,
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: '600',
    },
    footer: {
        marginTop: 30,
        alignItems: 'center',
    },
    footerText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.small,
    },
    highContrastInfo: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.small,
        fontWeight: 'bold',
        marginTop: 5,
    },
});