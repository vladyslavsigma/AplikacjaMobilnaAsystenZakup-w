import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch,
    ActivityIndicator,
    Modal,
    TextInput
} from 'react-native';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfileScreen() {
    const { theme, themeName, toggleTheme, isHighContrast } = useTheme();
    const [userInfo, setUserInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({
        username: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const username = await AsyncStorage.getItem('username');
            const email = await AsyncStorage.getItem('email');

            setUserInfo({
                username,
                email,
                joinDate: new Date().toISOString(),
            });

            setEditForm(prev => ({
                ...prev,
                username: username || '',
                email: email || '',
            }));
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!editForm.username.trim()) {
            Alert.alert('Błąd', 'Nazwa użytkownika nie może być pusta');
            return;
        }

        if (!editForm.email.trim() || !/\S+@\S+\.\S+/.test(editForm.email)) {
            Alert.alert('Błąd', 'Wprowadź poprawny email');
            return;
        }

        // Jeśli użytkownik zmienia hasło
        if (editForm.newPassword) {
            if (editForm.newPassword.length < 6) {
                Alert.alert('Błąd', 'Nowe hasło musi mieć co najmniej 6 znaków');
                return;
            }

            if (editForm.newPassword !== editForm.confirmPassword) {
                Alert.alert('Błąd', 'Hasła nie są identyczne');
                return;
            }
        }

        try {
            // Symulacja zapisu do backendu
            // W rzeczywistej aplikacji tutaj byłby fetch do API
            await AsyncStorage.setItem('username', editForm.username);
            await AsyncStorage.setItem('email', editForm.email);

            setUserInfo({
                username: editForm.username,
                email: editForm.email,
                joinDate: userInfo?.joinDate || new Date().toISOString(),
            });

            Alert.alert('Sukces', 'Profil został zaktualizowany');
            setEditModalVisible(false);
            setEditForm(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            }));
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Błąd', 'Nie udało się zapisać zmian');
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Wylogowanie',
            'Czy na pewno chcesz się wylogować?',
            [
                { text: 'Anuluj', style: 'cancel' },
                {
                    text: 'Wyloguj',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.clear();
                        router.replace('/(auth)/login');
                    }
                }
            ]
        );
    };

    const toggleThemeMode = () => {
        const newTheme: 'light' | 'highContrast' =
            themeName === 'light' ? 'highContrast' : 'light';
        toggleTheme(newTheme);
        Alert.alert('Tryb zmieniony',
            `Zmieniono na tryb: ${newTheme === 'highContrast' ? 'Wysoki kontrast' : 'Jasny'}`);
    };

    const styles = createStyles(theme, isHighContrast);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Ładowanie profilu...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                    <Icon name="person" size={50} color="white" />
                </View>

                <Text style={styles.userName}>{userInfo?.username || 'Użytkownik'}</Text>
                <Text style={styles.userEmail}>{userInfo?.email || 'brak@email.com'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚙️ Ustawienia</Text>

                <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                        <Icon name="notifications" size={24} color={theme.colors.primary} />
                        <View style={styles.settingText}>
                            <Text style={styles.settingTitle}>Powiadomienia</Text>
                            <Text style={styles.settingDescription}>Otrzymuj przypomnienia o zakupach</Text>
                        </View>
                    </View>
                    <Switch
                        value={notificationsEnabled}
                        onValueChange={setNotificationsEnabled}
                        trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                    />
                </View>

                <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                        <Icon name="visibility" size={24} color={theme.colors.primary} />
                        <View style={styles.settingText}>
                            <Text style={styles.settingTitle}>Tryb wysokiego kontrastu</Text>
                            <Text style={styles.settingDescription}>Dla osób słabo widzących</Text>
                        </View>
                    </View>
                    <Switch
                        value={isHighContrast}
                        onValueChange={toggleThemeMode}
                        trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                    />
                </View>
            </View>

            <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setEditModalVisible(true)}
            >
                <View style={styles.menuItemLeft}>
                    <Icon name="edit" size={24} color={theme.colors.primary} />
                    <Text style={styles.menuItemText}>Edytuj profil</Text>
                </View>
                <Icon name="chevron-right" size={24} color={theme.colors.disabled} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                    <Icon name="help" size={24} color={theme.colors.info} />
                    <Text style={styles.menuItemText}>Centrum pomocy</Text>
                </View>
                <Icon name="chevron-right" size={24} color={theme.colors.disabled} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                    <Icon name="info" size={24} color={theme.colors.primary} />
                    <Text style={styles.menuItemText}>O aplikacji</Text>
                </View>
                <Icon name="chevron-right" size={24} color={theme.colors.disabled} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Icon name="logout" size={24} color={theme.colors.danger} />
                <Text style={styles.logoutButtonText}>Wyloguj się</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={styles.versionText}>Wersja 1.2.1</Text>
                <Text style={styles.copyrightText}>© 2026 Asystent Zakupów</Text>
                <Text style={styles.themeInfo}>
                    Aktualny tryb: {isHighContrast ? 'Wysoki kontrast' : 'Jasny'}
                </Text>
            </View>

            {/* Modal do edycji profilu */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edytuj profil</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Icon name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Nazwa użytkownika *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.username}
                                    onChangeText={(text) => setEditForm({...editForm, username: text})}
                                    placeholder="Twoja nazwa"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.email}
                                    onChangeText={(text) => setEditForm({...editForm, email: text})}
                                    placeholder="twoj@email.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.sectionDivider}>
                                <Text style={styles.sectionDividerText}>Zmiana hasła (opcjonalnie)</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Aktualne hasło</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.currentPassword}
                                    onChangeText={(text) => setEditForm({...editForm, currentPassword: text})}
                                    placeholder="Aktualne hasło"
                                    secureTextEntry
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Nowe hasło</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.newPassword}
                                    onChangeText={(text) => setEditForm({...editForm, newPassword: text})}
                                    placeholder="Nowe hasło (min. 6 znaków)"
                                    secureTextEntry
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Potwierdź nowe hasło</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editForm.confirmPassword}
                                    onChangeText={(text) => setEditForm({...editForm, confirmPassword: text})}
                                    placeholder="Potwierdź nowe hasło"
                                    secureTextEntry
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Anuluj</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSaveProfile}
                            >
                                <Text style={styles.saveButtonText}>Zapisz zmiany</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const createStyles = (theme: any, isHighContrast: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.medium,
    },
    profileHeader: {
        backgroundColor: theme.colors.card,
        alignItems: 'center',
        paddingVertical: 30,
        marginBottom: 15,
        borderBottomWidth: isHighContrast ? 3 : 1,
        borderBottomColor: theme.colors.border,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.text,
    },
    userName: {
        fontSize: theme.fontSize.xlarge,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 5,
    },
    userEmail: {
        fontSize: theme.fontSize.medium,
        color: theme.colors.textSecondary,
        fontWeight: isHighContrast ? 'bold' : 'normal',
    },
    section: {
        backgroundColor: theme.colors.card,
        marginHorizontal: 15,
        marginBottom: 15,
        borderRadius: 12,
        padding: 20,
        borderWidth: isHighContrast ? 2 : 0,
        borderColor: theme.colors.border,
    },
    sectionTitle: {
        fontSize: theme.fontSize.large,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 15,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: isHighContrast ? 2 : 1,
        borderBottomColor: theme.colors.border,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        marginLeft: 15,
        flex: 1,
    },
    settingTitle: {
        fontSize: theme.fontSize.medium,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: theme.fontSize.small,
        color: theme.colors.textSecondary,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        marginHorizontal: 15,
        marginBottom: 10,
        padding: 15,
        borderRadius: 12,
        borderWidth: isHighContrast ? 2 : 0,
        borderColor: theme.colors.border,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuItemText: {
        fontSize: theme.fontSize.medium,
        color: theme.colors.text,
        marginLeft: 15,
        fontWeight: isHighContrast ? 'bold' : 'normal',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.card,
        marginHorizontal: 15,
        marginTop: 20,
        padding: 18,
        borderRadius: 12,
        gap: 10,
        borderWidth: isHighContrast ? 3 : 2,
        borderColor: theme.colors.danger,
    },
    logoutButtonText: {
        fontSize: theme.fontSize.medium,
        fontWeight: '600',
        color: theme.colors.danger,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 15,
        marginTop: 20,
    },
    versionText: {
        fontSize: theme.fontSize.small,
        color: theme.colors.textSecondary,
        marginBottom: 5,
    },
    copyrightText: {
        fontSize: theme.fontSize.small,
        color: theme.colors.textSecondary,
    },
    themeInfo: {
        fontSize: theme.fontSize.small,
        color: theme.colors.primary,
        fontWeight: '600',
        marginTop: 10,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: isHighContrast ? 3 : 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: 15,
    },
    modalTitle: {
        fontSize: theme.fontSize.xlarge,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    modalBody: {
        maxHeight: 400,
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: theme.fontSize.medium,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: theme.colors.background,
        borderWidth: isHighContrast ? 3 : 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        padding: 12,
        fontSize: theme.fontSize.medium,
        color: theme.colors.text,
    },
    sectionDivider: {
        marginVertical: 20,
        alignItems: 'center',
    },
    sectionDividerText: {
        fontSize: theme.fontSize.medium,
        fontWeight: 'bold',
        color: theme.colors.text,
        paddingHorizontal: 10,
        backgroundColor: theme.colors.card,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: isHighContrast ? 3 : 1,
        borderTopColor: theme.colors.border,
    },
    cancelButton: {
        flex: 1,
        alignItems: 'center',
        padding: 15,
        backgroundColor: theme.colors.background,
        borderRadius: 10,
        borderWidth: isHighContrast ? 3 : 2,
        borderColor: theme.colors.textSecondary,
    },
    cancelButtonText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.medium,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        alignItems: 'center',
        padding: 15,
        backgroundColor: theme.colors.primary,
        borderRadius: 10,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.text,
    },
    saveButtonText: {
        color: 'white',
        fontSize: theme.fontSize.medium,
        fontWeight: '600',
    },
});