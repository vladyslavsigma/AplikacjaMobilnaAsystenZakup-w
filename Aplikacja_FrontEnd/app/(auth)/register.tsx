import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { Link, router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';


import {API_BASE_URL} from "@/app/constants/Config";

export default function RegisterScreen() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!username.trim() || username.length < 3) {
            Alert.alert('Błąd', 'Nazwa użytkownika musi mieć co najmniej 3 znaki');
            return;
        }

        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
            Alert.alert('Błąd', 'Wprowadź poprawny email');
            return;
        }

        if (!password || password.length < 6) {
            Alert.alert('Błąd', 'Hasło musi mieć co najmniej 6 znaków');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Błąd', 'Hasła nie są identyczne');
            return;
        }

        setLoading(true);
        try {
            console.log(`Próba rejestracji: ${API_BASE_URL}/auth/register`);

            const response = await fetch(`${API_BASE_URL}/auth/register`,
                {

                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            // NAJPIERW SPRAWDZAMY CZY OK
            if (response.ok) {
                const data = await response.json();
                Alert.alert(
                    'Sukces!',
                    'Konto zostało utworzone! Możesz się teraz zalogować.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            }  else if (response.status === 400) {
                Alert.alert('Username or email are already exist');
            }
            else {

                const errorText = await response.text();
                console.error('Błąd serwera (Status ' + response.status + '):', errorText);

                Alert.alert('Błąd rejestracji', `Serwer zwrócił błąd ${response.status}. Sprawdź logi.`);
            }
        } catch (error) {
            console.error('Register error (Network):', error);
            Alert.alert('Błąd', 'Nie udało się połączyć z serwerem: ' + API_BASE_URL);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Icon name="person-add" size={60} color="#9b59b6" />
                <Text style={styles.title}>Utwórz konto</Text>
                <Text style={styles.subtitle}>Dołącz do Asystenta Zakupów</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Nazwa użytkownika *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Twoja nazwa"
                    value={username}
                    onChangeText={setUsername}
                    editable={!loading}
                />

                <Text style={styles.label}>Email *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="twoj@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                />

                <Text style={styles.label}>Hasło *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Minimum 6 znaków"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!loading}
                />

                <Text style={styles.label}>Potwierdź hasło *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Wprowadź hasło ponownie"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!loading}
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Icon name="check-circle" size={20} color="white" />
                            <Text style={styles.buttonText}>Utwórz konto</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Link href="/(auth)/login" asChild>
                    <TouchableOpacity style={styles.backButton}>
                        <Icon name="arrow-back" size={20} color="#3498db" />
                        <Text style={styles.backButtonText}>Masz już konto? Zaloguj się</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginTop: 15,
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    form: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: '#f8f9fa',
    },
    button: {
        flexDirection: 'row',
        backgroundColor: '#9b59b6',
        borderRadius: 10,
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        gap: 10,
    },
    buttonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25,
        gap: 10,
    },
    backButtonText: {
        color: '#3498db',
        fontSize: 14,
        fontWeight: '600',
    },
});