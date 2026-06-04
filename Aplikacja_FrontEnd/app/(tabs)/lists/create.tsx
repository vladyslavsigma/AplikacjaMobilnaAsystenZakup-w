import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext'; // Dodaj ten import

import {API_BASE_URL} from "@/app/constants/Config";

export default function CreateListScreen() {
    const { theme, isHighContrast } = useTheme(); // Dodaj tę linię
    const [listName, setListName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    // Użyj motywu do tworzenia stylów
    const styles = createStyles(theme, isHighContrast);

    const handleCreateList = async () => {
        if (!listName.trim()) {
            Alert.alert('Błąd', 'Wprowadź nazwę listy');
            return;
        }

        try {
            setLoading(true);

            // Pobierz dane użytkownika z AsyncStorage
            const email = await AsyncStorage.getItem('email');
            const username = await AsyncStorage.getItem('username');

            // Tymczasowy userId - w prawdziwej aplikacji użyj ID z tokena
            const userId = email || 'demo-user';

            // Przygotuj dane do wysłania
            const listData = {
                name: listName.trim(),
                description: description.trim() || null
            };

            console.log('Wysyłanie danych:', { userId, ...listData });

            // Wyślij żądanie do backendu
            const response = await fetch(`${API_BASE_URL}/shopping/lists?userId=${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(listData),
            });

            console.log('Status odpowiedzi:', response.status);

            if (response.ok) {
                const createdList = await response.json();
                console.log('Utworzona lista:', createdList);

                Alert.alert(
                    'Sukces!',
                    `Lista "${listName}" została utworzona`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Przekaż dane przez router
                                router.replace({
                                    pathname: '/(tabs)/lists/[id]',
                                    params: { id: createdList.id }
                                });
                            }
                        }
                    ]
                );
            } else {
                const errorText = await response.text();
                console.error('Błąd odpowiedzi:', errorText);

                let errorMessage = 'Nie udało się utworzyć listy';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // Jeśli nie można sparsować JSON, użyj tekstu
                    if (errorText.includes('already exists')) {
                        errorMessage = 'Lista o tej nazwie już istnieje';
                    }
                }

                Alert.alert('Błąd', errorMessage);
            }
        } catch (error: any) {
            console.error('Błąd tworzenia listy:', error);

            // Szczegółowe informacje o błędzie
            let errorMessage = 'Nie udało się połączyć z serwerem';
            if (error.message) {
                errorMessage += `: ${error.message}`;
            }
            if (error.code) {
                errorMessage += ` (kod: ${error.code})`;
            }

            Alert.alert('Błąd połączenia', errorMessage);

            // Tymczasowo symuluj sukces dla demo
            if (__DEV__) {
                simulateDemoSuccess();
            }
        } finally {
            setLoading(false);
        }
    };

    const simulateDemoSuccess = () => {
        Alert.alert(
            'Demo: Sukces!',
            `Lista "${listName}" została utworzona (tryb demo)`,
            [{
                text: 'OK',
                onPress: () => {
                    // Przekieruj do szczegółów z przykładowym ID
                    router.replace({
                        pathname: '/(tabs)/lists/[id]',
                        params: {
                            id: `demo-${Date.now()}`,
                            demo: 'true',
                            listName: listName
                        }
                    });
                }
            }]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nowa lista zakupów</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Nazwa listy *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="np. Zakupy na weekend"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={listName}
                        onChangeText={setListName}
                        maxLength={50}
                        editable={!loading}
                    />
                    <Text style={styles.charCount}>{listName.length}/50</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Opis (opcjonalnie)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Dodaj opis listy..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        maxLength={200}
                        editable={!loading}
                    />
                    <Text style={styles.charCount}>{description.length}/200</Text>
                </View>

                <TouchableOpacity
                    style={[styles.createButton, loading && styles.buttonDisabled]}
                    onPress={handleCreateList}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Icon name="check" size={20} color="white" />
                            <Text style={styles.createButtonText}>Utwórz listę</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                    disabled={loading}
                >
                    <Text style={styles.cancelButtonText}>Anuluj</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>💡 Porady:</Text>
                <View style={styles.tipItem}>
                    <Icon name="check-circle" size={16} color={theme.colors.success} />
                    <Text style={styles.tipText}>Nadaj konkretną nazwę</Text>
                </View>
                <View style={styles.tipItem}>
                    <Icon name="check-circle" size={16} color={theme.colors.success} />
                    <Text style={styles.tipText}>Możesz dodać produkty po utworzeniu</Text>
                </View>
                <View style={styles.tipItem}>
                    <Icon name="check-circle" size={16} color={theme.colors.success} />
                    <Text style={styles.tipText}>Zapisywane w bazie danych</Text>
                </View>
            </View>

            {isHighContrast && (
                <View style={styles.highContrastInfo}>
                    <Icon name="visibility" size={16} color={theme.colors.primary} />
                    <Text style={styles.highContrastText}>Tryb wysokiego kontrastu włączony</Text>
                </View>
            )}
        </ScrollView>
    );
}

// Zamień static styles na dynamiczne
const createStyles = (theme: any, isHighContrast: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: isHighContrast ? 3 : 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: isHighContrast ? theme.fontSize.xlarge : theme.fontSize.large,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    form: {
        padding: 20,
    },
    inputContainer: {
        marginBottom: isHighContrast ? 25 : 20,
    },
    label: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: isHighContrast ? 12 : 8,
    },
    input: {
        backgroundColor: theme.colors.card,
        borderWidth: isHighContrast ? 3 : 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        padding: isHighContrast ? 18 : 15,
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.text,
    },
    textArea: {
        height: isHighContrast ? 120 : 100,
        textAlignVertical: 'top',
    },
    charCount: {
        textAlign: 'right',
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        color: theme.colors.textSecondary,
        marginTop: 5,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    createButton: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        borderRadius: 10,
        padding: isHighContrast ? 22 : 18,
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
    createButtonText: {
        color: 'white',
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: '600',
    },
    cancelButton: {
        alignItems: 'center',
        padding: isHighContrast ? 20 : 15,
        marginTop: 10,
    },
    cancelButtonText: {
        color: theme.colors.danger,
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: '600',
    },
    tipsContainer: {
        backgroundColor: isHighContrast ? theme.colors.card : '#e8f4fc',
        margin: 20,
        padding: isHighContrast ? 25 : 20,
        borderRadius: 12,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.border,
    },
    tipsTitle: {
        fontSize: isHighContrast ? theme.fontSize.large + 2 : theme.fontSize.large,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 15,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: isHighContrast ? 15 : 10,
        gap: 10,
    },
    tipText: {
        flex: 1,
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.primary,
        lineHeight: isHighContrast ? 24 : 20,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    highContrastInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.card,
        margin: 20,
        padding: isHighContrast ? 18 : 15,
        borderRadius: 10,
        gap: 10,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.primary,
    },
    highContrastText: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        color: theme.colors.primary,
        fontWeight: '600',
    },
});