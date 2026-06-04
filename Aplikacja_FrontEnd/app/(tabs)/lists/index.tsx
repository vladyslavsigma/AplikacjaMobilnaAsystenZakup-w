import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext'; // Dodaj ten import

import {API_BASE_URL} from "@/app/constants/Config";

// Interfejs zgodny z tym co zwraca backend (tak jak w dashboard)
interface PriceComparison {
    storePrices: {
        [store: string]: number;
    };
    cheapestStore?: string;
    cheapestPrice?: number;
}

interface ShoppingItem {
    id: string;
    _id?: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    notes?: string;
    priceComparison?: PriceComparison;
}

interface ShoppingListBackend {
    id: string;
    _id?: string;
    name: string;
    description?: string;
    createdAt: string;
    items: ShoppingItem[];
}

// Interfejs dla widoku list (przekształcony)
interface ShoppingListDisplay {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    itemCount: number;
    totalEstimatedCost?: number;
}

// Lista sklepów (musi być taka sama jak w [id].tsx)
const STORES = ['Biedronka', 'Lidl', 'Carrefour', 'Auchan'];

export default function ShoppingListsScreen() {
    const { theme, isHighContrast } = useTheme(); // Dodaj tę linię
    const [lists, setLists] = useState<ShoppingListDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState<string>('');

    // Użyj motywu do tworzenia stylów
    const styles = createStyles(theme, isHighContrast);

    const getSampleLists = (): ShoppingListDisplay[] => {
        return [
            {
                id: '1',
                name: 'Zakupy na weekend',
                description: 'Produkty na sobotę i niedzielę',
                createdAt: '2024-01-15',
                itemCount: 8,
                totalEstimatedCost: 150.50
            },
            {
                id: '2',
                name: 'Lista podstawowa',
                description: 'Produkty codziennego użytku',
                createdAt: '2024-01-10',
                itemCount: 12,
                totalEstimatedCost: 230.75
            },
            {
                id: '3',
                name: 'Impreza urodzinowa',
                description: 'Przyjęcie dla 10 osób',
                createdAt: '2024-01-05',
                itemCount: 15,
                totalEstimatedCost: 450.00
            }
        ];
    };

    // Funkcja do obliczania najtańszego sklepu dla listy (taka sama jak w [id].tsx)
    const calculateBestStoreForList = (items: ShoppingItem[]) => {
        const storeTotals: { [store: string]: number } = {};

        // Inicjalizuj sklepy
        STORES.forEach(store => {
            storeTotals[store] = 0;
        });

        // Oblicz koszt w każdym sklepie
        items.forEach(item => {
            STORES.forEach(store => {
                const price = item.priceComparison?.storePrices?.[store] || 0;
                storeTotals[store] += price * item.quantity;
            });
        });

        // Znajdź najtańszy sklep (który ma ceny > 0)
        let bestStore = '';
        let bestPrice = Infinity;

        Object.entries(storeTotals).forEach(([store, total]) => {
            if (total > 0 && total < bestPrice) {
                bestPrice = total;
                bestStore = store;
            }
        });

        return { bestStore, bestPrice: bestPrice < Infinity ? bestPrice : 0, storeTotals };
    };

    // Funkcja do przekształcania danych z backendu na format widoku
    const transformBackendData = (backendLists: ShoppingListBackend[]): ShoppingListDisplay[] => {
        return backendLists.map(list => {
            // Oblicz koszt w NAJTAŃSZYM SKLEPIE (tak jak w [id].tsx)
            let totalCost = 0;
            let bestPrice = 0;

            if (list.items && Array.isArray(list.items) && list.items.length > 0) {
                const { bestPrice: calculatedBestPrice } = calculateBestStoreForList(list.items);
                bestPrice = calculatedBestPrice;
                totalCost = bestPrice;
            }

            return {
                id: list.id || list._id || '',
                name: list.name,
                description: list.description,
                createdAt: list.createdAt,
                itemCount: list.items?.length || 0,
                totalEstimatedCost: bestPrice > 0 ? parseFloat(bestPrice.toFixed(2)) : undefined
            };
        });
    };

    useEffect(() => {
        loadUserId();
    }, []);

    useEffect(() => {
        if (userId) {
            fetchLists();
        }
    }, [userId]);

    const loadUserId = async () => {
        try {
            const email = await AsyncStorage.getItem('email');
            setUserId(email || 'demo-user');
        } catch (error) {
            console.error('Błąd ładowania userId:', error);
            setUserId('demo-user');
        }
    };

    const fetchLists = async () => {
        try {
            setLoading(true);

            const email = await AsyncStorage.getItem('email');
            const userId = email || 'demo-user';

            console.log('Pobieranie list dla userId:', userId);
            console.log('URL:', `${API_BASE_URL}/shopping/lists?userId=${userId}`);

            const response = await fetch(`${API_BASE_URL}/shopping/lists?userId=${userId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            console.log('Status pobierania list:', response.status);

            // Najpierw pobierz jako tekst do debugowania
            const responseText = await response.text();
            console.log('Odpowiedź (pierwsze 500 znaków):', responseText.substring(0, 500));

            if (response.ok && responseText) {
                try {
                    const data: ShoppingListBackend[] = JSON.parse(responseText);
                    console.log('Otrzymane listy (liczba):', data.length);
                    console.log('Przykładowa lista:', data[0]);

                    // Przekształć dane z backendu na format widoku
                    const transformedLists = transformBackendData(data);
                    console.log('Przekształcone listy:', transformedLists);
                    setLists(transformedLists);
                } catch (parseError) {
                    console.error('Błąd parsowania JSON:', parseError);
                    console.log('Surowa odpowiedź:', responseText);

                    // Użyj przykładowych danych
                    const sampleLists = getSampleLists();
                    console.log('Używam przykładowych danych z powodu błędu parsowania');
                    setLists(sampleLists);
                }
            } else {
                console.error('Błąd HTTP:', response.status, responseText);

                const sampleLists = getSampleLists();
                console.log('Używam przykładowych danych z powodu błędu HTTP');
                setLists(sampleLists);
            }
        } catch (error) {
            console.error('Error fetching lists:', error);
            console.log('Używam przykładowych danych z powodu błędu sieci');
            setLists(getSampleLists());
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchLists();
    };

    const handleCreateList = () => {
        router.push('/(tabs)/lists/create');
    };

    const handleDeleteList = (listId: string, listName: string) => {
        Alert.alert(
            'Usuwanie listy',
            `Czy na pewno chcesz usunąć listę "${listName}"?`,
            [
                { text: 'Anuluj', style: 'cancel' },
                {
                    text: 'Usuń',
                    style: 'destructive',
                    onPress: () => deleteList(listId)
                }
            ]
        );
    };

    const deleteList = async (listId: string) => {
        try {
            const email = await AsyncStorage.getItem('email');
            const userId = email || 'demo-user';

            console.log('Usuwanie listy:', listId, 'dla user:', userId);

            const response = await fetch(`${API_BASE_URL}/shopping/lists/${listId}?userId=${userId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                },
            });

            console.log('Status usuwania:', response.status);

            if (response.ok) {
                // Usuń listę ze stanu
                setLists(prevLists => prevLists.filter(list => list.id !== listId));
                Alert.alert('Sukces', 'Lista została usunięta');
            } else {
                const errorText = await response.text();
                console.error('Błąd usuwania listy:', errorText);

                // W trybie demo i tak usuń z widoku
                setLists(prevLists => prevLists.filter(list => list.id !== listId));
                Alert.alert('Demo', 'Lista usunięta (tryb demo)');
            }
        } catch (error) {
            console.error('Error deleting list:', error);

            // W trybie demo i tak usuń z widoku
            setLists(prevLists => prevLists.filter(list => list.id !== listId));
            Alert.alert('Demo', 'Lista usunięta (tryb demo)');
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return dateString; // Zwróć oryginalny string jeśli data jest nieprawidłowa
            }
            return date.toLocaleDateString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Błąd formatowania daty:', dateString, error);
            return dateString;
        }
    };

    const renderListCard = ({ item }: { item: ShoppingListDisplay }) => (
        <TouchableOpacity
            style={styles.listCard}
            onPress={() => router.push(`/(tabs)/lists/${item.id}`)}
        >
            <View style={styles.listHeader}>
                <View style={styles.listIcon}>
                    <Icon name="list-alt" size={30} color={theme.colors.primary} />
                </View>
                <View style={styles.listInfo}>
                    <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                    {item.description && (
                        <Text style={styles.listDescription} numberOfLines={2}>
                            {item.description}
                        </Text>
                    )}
                    <Text style={styles.listMetadata}>
                        {item.itemCount} {item.itemCount === 1 ? 'produkt' :
                        item.itemCount < 5 ? 'produkty' : 'produktów'} •
                        {formatDate(item.createdAt)}
                    </Text>
                    {item.totalEstimatedCost && item.totalEstimatedCost > 0 && (
                        <Text style={styles.listCost}>
                            💰 Koszt w najtańszym sklepie: {item.totalEstimatedCost.toFixed(2)} zł
                        </Text>
                    )}
                </View>
            </View>

            <View style={styles.listActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push(`/(tabs)/lists/${item.id}`)}
                >
                    <Icon name="visibility" size={18} color={theme.colors.primary} />
                    <Text style={styles.actionText}>Otwórz</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.background }]}
                    onPress={() => Alert.alert('Udostępnij', `Udostępnianie listy: ${item.name}`)}
                >
                    <Icon name="share" size={18} color={theme.colors.textSecondary} />
                    <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>Udostępnij</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, {
                        backgroundColor: isHighContrast ? theme.colors.card : '#ffeaea'
                    }]}
                    onPress={() => handleDeleteList(item.id, item.name)}
                >
                    <Icon name="delete" size={18} color={theme.colors.danger} />
                    <Text style={[styles.actionText, { color: theme.colors.danger }]}>Usuń</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>📝 Moje listy zakupów</Text>
                    <TouchableOpacity style={styles.addButton} onPress={handleCreateList}>
                        <Icon name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Ładowanie list...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📝 Moje listy zakupów</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleCreateList}>
                    <Icon name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {lists.length > 0 && (
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{lists.length}</Text>
                        <Text style={styles.statLabel}>Listy</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {lists.reduce((sum, list) => sum + list.itemCount, 0)}
                        </Text>
                        <Text style={styles.statLabel}>Produkty</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {lists.reduce((sum, list) => sum + (list.totalEstimatedCost || 0), 0).toFixed(2)} zł
                        </Text>
                        <Text style={styles.statLabel}>Wartość</Text>
                    </View>
                </View>
            )}

            {lists.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="shopping-cart" size={80} color={theme.colors.disabled} />
                    <Text style={styles.emptyTitle}>Brak list zakupów</Text>
                    <Text style={styles.emptyText}>
                        Utwórz swoją pierwszą listę zakupów, aby zacząć porównywać ceny!
                    </Text>
                    <TouchableOpacity style={styles.createButton} onPress={handleCreateList}>
                        <Text style={styles.createButtonText}>Utwórz pierwszą listę</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={lists}
                    renderItem={renderListCard}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.primary]}
                        />
                    }
                    ListFooterComponent={<View style={{ height: 20 }} />}
                />
            )}
        </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: isHighContrast ? 3 : 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: isHighContrast ? theme.fontSize.xlarge : theme.fontSize.large,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    addButton: {
        width: isHighContrast ? 50 : 40,
        height: isHighContrast ? 50 : 40,
        borderRadius: isHighContrast ? 25 : 20,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.text,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.textSecondary,
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: isHighContrast ? '600' : 'normal',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.card,
        margin: 15,
        padding: isHighContrast ? 25 : 20,
        borderRadius: 12,
        justifyContent: 'space-around',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isHighContrast ? 0.2 : 0.05,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: isHighContrast ? theme.fontSize.xlarge + 4 : theme.fontSize.xlarge,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statLabel: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        color: theme.colors.textSecondary,
        marginTop: 4,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        backgroundColor: theme.colors.background,
    },
    emptyTitle: {
        fontSize: isHighContrast ? theme.fontSize.xxlarge : theme.fontSize.xlarge,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: isHighContrast ? theme.fontSize.large : theme.fontSize.large - 2,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: isHighContrast ? 26 : 22,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    createButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: isHighContrast ? 35 : 30,
        paddingVertical: isHighContrast ? 15 : 12,
        borderRadius: 8,
        marginTop: 30,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.text,
    },
    createButtonText: {
        color: 'white',
        fontSize: isHighContrast ? theme.fontSize.large : theme.fontSize.large - 2,
        fontWeight: '600',
    },
    listContainer: {
        padding: 15,
    },
    listCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: isHighContrast ? 20 : 15,
        marginBottom: isHighContrast ? 20 : 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isHighContrast ? 0.2 : 0.05,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.border,
    },
    listHeader: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    listIcon: {
        marginRight: 15,
    },
    listInfo: {
        flex: 1,
    },
    listName: {
        fontSize: isHighContrast ? theme.fontSize.large + 2 : theme.fontSize.large,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 5,
    },
    listDescription: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        lineHeight: isHighContrast ? 22 : 18,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    listMetadata: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        color: theme.colors.textSecondary,
        marginBottom: 5,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    listCost: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.success,
        fontWeight: '600',
        marginTop: 5,
    },
    listActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: isHighContrast ? 3 : 1,
        borderTopColor: theme.colors.border,
        paddingTop: 15,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isHighContrast ? theme.colors.background : '#e8f4fc',
        paddingHorizontal: isHighContrast ? 15 : 12,
        paddingVertical: isHighContrast ? 12 : 8,
        borderRadius: 8,
        gap: 6,
        minWidth: isHighContrast ? 90 : 80,
        justifyContent: 'center',
        borderWidth: isHighContrast ? 2 : 0,
        borderColor: theme.colors.border,
    },
    actionText: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        fontWeight: '600',
        color: theme.colors.primary,
    },
});