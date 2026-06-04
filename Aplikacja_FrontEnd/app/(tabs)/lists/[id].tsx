import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext'; // Dodaj ten import

import {API_BASE_URL} from "@/app/constants/Config";

interface ShoppingItem {
    id: string;
    _id?: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    notes?: string;
    priceComparison?: {
        storePrices: { [store: string]: number };
        cheapestStore?: string;
        cheapestPrice?: number;
    };
}

interface ShoppingList {
    id: string;
    _id?: string;
    name: string;
    description?: string;
    createdAt: string;
    userId?: string;
    items: ShoppingItem[];
}

export default function ListDetailScreen() {
    const { theme, isHighContrast } = useTheme(); // Dodaj tę linię
    const { id } = useLocalSearchParams();
    const [list, setList] = useState<ShoppingList | null>(null);
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '',
        category: 'Inne',
        quantity: 1,
        unit: 'szt',
        notes: ''
    });
    const [stores] = useState(['Biedronka', 'Lidl', 'Carrefour', 'Auchan']);

    const scrollViewRef = useRef<ScrollView>(null);

    // Użyj motywu do tworzenia stylów
    const styles = createStyles(theme, isHighContrast);

    useEffect(() => {
        fetchListDetails();
    }, [id]);

    const fetchListDetails = async () => {
        try {
            setLoading(true);

            const email = await AsyncStorage.getItem('email');
            const userId = email || 'demo-user';

            console.log('Pobieranie listy:', id, 'dla userId:', userId);

            const response = await fetch(`${API_BASE_URL}/shopping/lists/${id}?userId=${userId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            console.log('Status odpowiedzi:', response.status);

            if (response.ok) {
                const listData = await response.json();
                console.log('Otrzymane dane listy:', listData);

                const normalizedList = {
                    ...listData,
                    id: listData._id || listData.id,
                    items: listData.items || []
                };

                setList(normalizedList);
                setItems(normalizedList.items || []);
            } else {
                const errorText = await response.text();
                console.error('Błąd pobierania listy:', errorText);
                Alert.alert('Błąd', 'Nie udało się załadować listy');
            }
        } catch (error) {
            console.error('Error fetching list:', error);
            Alert.alert('Błąd', 'Nie udało się połączyć z serwerem');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const addItem = async () => {
        if (!newItem.name.trim()) {
            Alert.alert('Błąd', 'Wprowadź nazwę produktu');
            return;
        }

        try {
            if (!list) return;

            const email = await AsyncStorage.getItem('email');
            const userId = email || 'demo-user';

            console.log('Dodawanie produktu do listy:', list.id);

            const response = await fetch(`${API_BASE_URL}/shopping/lists/${list.id}/items?userId=${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newItem.name,
                    category: newItem.category,
                    quantity: newItem.quantity,
                    unit: newItem.unit,
                    notes: newItem.notes
                }),
            });

            console.log('Status dodawania produktu:', response.status);

            if (response.ok) {
                const updatedList = await response.json();
                console.log('Zaktualizowana lista po dodaniu produktu:', updatedList);

                setList(updatedList);
                setItems(updatedList.items || []);

                setNewItem({ name: '', category: 'Inne', quantity: 1, unit: 'szt', notes: '' });
                setModalVisible(false);
                Alert.alert('Sukces', 'Produkt dodany do listy');
            } else {
                const errorText = await response.text();
                console.error('Błąd dodawania produktu:', errorText);
                Alert.alert('Błąd', 'Nie udało się dodać produktu');
            }
        } catch (error) {
            console.error('Error adding item:', error);
            Alert.alert('Błąd', 'Nie udało się połączyć z serwerem');
        }
    };

    const removeItem = async (itemId: string) => {
        Alert.alert(
            'Usuwanie produktu',
            'Czy na pewno chcesz usunąć ten produkt z listy?',
            [
                { text: 'Anuluj', style: 'cancel' },
                {
                    text: 'Usuń',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!list) return;

                            const email = await AsyncStorage.getItem('email');
                            const userId = email || 'demo-user';

                            console.log('Usuwanie produktu:', itemId, 'z listy:', list.id);

                            const response = await fetch(`${API_BASE_URL}/shopping/lists/${list.id}/items/${itemId}?userId=${userId}`, {
                                method: 'DELETE',
                            });

                            console.log('Status usuwania produktu:', response.status);

                            if (response.ok) {
                                const updatedList = await response.json();
                                console.log('Zaktualizowana lista po usunięciu produktu:', updatedList);

                                setList(updatedList);
                                setItems(updatedList.items || []);
                                Alert.alert('Sukces', 'Produkt usunięty z listy');
                            } else {
                                const errorText = await response.text();
                                console.error('Błąd usuwania produktu:', errorText);
                                Alert.alert('Błąd', 'Nie udało się usunąć produktu');
                            }
                        } catch (error) {
                            console.error('Error removing item:', error);
                            Alert.alert('Błąd', 'Nie udało się połączyć z serwerem');
                        }
                    }
                }
            ]
        );
    };

    const updatePrice = async (itemId: string, store: string, price: string) => {
        const priceNum = parseFloat(price.replace(',', '.'));
        if (isNaN(priceNum) || priceNum < 0) {
            Alert.alert('Błąd', 'Wprowadź poprawną cenę');
            return;
        }

        try {
            if (!list) return;

            const email = await AsyncStorage.getItem('email');
            const userId = email || 'demo-user';

            console.log('Aktualizacja ceny dla produktu:', itemId, 'sklep:', store, 'cena:', priceNum);

            const response = await fetch(`${API_BASE_URL}/shopping/lists/${list.id}/items/${itemId}/price?userId=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ store, price: priceNum }),
            });

            console.log('Status aktualizacji ceny:', response.status);

            if (response.ok) {
                const updatedList = await response.json();
                console.log('Zaktualizowana lista po zmianie ceny:', updatedList);

                setList(updatedList);
                setItems(updatedList.items || []);

                // Informacja o zapisaniu ceny
                Alert.alert('Sukces', 'Cena została zapisana!');
            } else {
                const errorText = await response.text();
                console.error('Błąd aktualizacji ceny:', errorText);
                Alert.alert('Błąd', 'Nie udało się zapisać ceny');
            }
        } catch (error) {
            console.error('Error updating price:', error);
            Alert.alert('Błąd', 'Nie udało się połączyć z serwerem');
        }
    };

    const updateQuantity = async (itemId: string, newQuantity: number) => {
        try {
            if (!list) return;

            // 1. LOKALNA AKTUALIZACJA - natychmiastowa zmiana w UI
            const updatedItems = items.map(item =>
                (item.id === itemId || item._id === itemId)
                    ? { ...item, quantity: Math.max(1, newQuantity) }
                    : item
            );
            setItems(updatedItems);

            const email = await AsyncStorage.getItem('email');
            const userId = email || 'demo-user';

            console.log('Aktualizacja ilości dla produktu:', itemId, 'nowa ilość:', newQuantity);

            const itemToUpdate = items.find(item => item.id === itemId || item._id === itemId);
            if (!itemToUpdate) return;

            const response = await fetch(`${API_BASE_URL}/shopping/lists/${list.id}/items/${itemId}?userId=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...itemToUpdate,
                    quantity: newQuantity
                }),
            });

            console.log('Status aktualizacji ilości:', response.status);

            if (response.ok) {
                const updatedList = await response.json();
                console.log('Zaktualizowana lista po zmianie ilości:', updatedList);

                // 2. SYNCHRONIZACJA Z BACKENDEM
                setList(updatedList);
                setItems(updatedList.items || []);
            } else {
                const errorText = await response.text();
                console.error('Błąd aktualizacji ilości:', errorText);
                // Nie pokazujemy alertu - UI już zostało zaktualizowane
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
            // Nie pokazujemy alertu - UI już zostało zaktualizowane
        }
    };

    const updateListInfo = async (field: 'name' | 'description', value: string) => {
        try {
            if (!list) return;

            const email = await AsyncStorage.getItem('email');
            const userId = email || 'demo-user';

            console.log('Aktualizacja informacji listy:', field, '=', value);

            // Nie mamy endpointu do aktualizacji listy, więc pokażemy tylko info
            Alert.alert('Informacja',
                `Aby zmienić ${field === 'name' ? 'nazwę' : 'opis'} listy, przejdź do ekranu edycji listy.`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error updating list info:', error);
        }
    };

    const calculateBestStore = () => {
        const storeTotals: { [store: string]: number } = {};

        stores.forEach(store => {
            storeTotals[store] = 0;
            items.forEach(item => {
                const price = item.priceComparison?.storePrices?.[store] || 0;
                storeTotals[store] += price * item.quantity;
            });
        });

        let bestStore = '';
        let bestPrice = Infinity;

        Object.entries(storeTotals).forEach(([store, total]) => {
            if (total > 0 && total < bestPrice) {
                bestPrice = total;
                bestStore = store;
            }
        });

        return { bestStore, bestPrice, storeTotals };
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchListDetails();
    };

    const { bestStore, bestPrice, storeTotals } = calculateBestStore();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Ładowanie listy...</Text>
            </View>
        );
    }

    if (!list) {
        return (
            <View style={styles.loadingContainer}>
                <Icon name="error" size={50} color={theme.colors.danger} />
                <Text style={styles.errorText}>Nie udało się załadować listy</Text>
                <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Wróć do list</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <TouchableOpacity onPress={() => updateListInfo('name', list.name)}>
                        <Text style={styles.listName}>{list.name}</Text>
                    </TouchableOpacity>
                    {list.description && (
                        <TouchableOpacity onPress={() => updateListInfo('description', list.description || '')}>
                            <Text style={styles.listDescription}>{list.description}</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.addItemButton} onPress={() => setModalVisible(true)}>
                    <Icon name="add" size={20} color="white" />
                    <Text style={styles.addItemText}>Dodaj</Text>
                </TouchableOpacity>
            </View>

            {/* PRZYCISK ODSWIEŻANIA */}
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={onRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <>
                            <Icon name="refresh" size={20} color={theme.colors.primary} />
                            <Text style={styles.refreshButtonText}>Odśwież</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* STATS */}
            <View style={styles.statsContainer}>
                <View style={styles.stat}>
                    <Icon name="shopping-basket" size={20} color={theme.colors.primary} />
                    <Text style={styles.statText}>{items.length} produktów</Text>
                </View>
                {bestStore && (
                    <View style={styles.stat}>
                        <Icon name="savings" size={20} color={theme.colors.success} />
                        <Text style={styles.statText}>Najtaniej: {bestStore}</Text>
                    </View>
                )}
            </View>

            {/* NAGŁÓWEK Z CENAMI SKLEPÓW */}
            <View style={styles.storesHeaderContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    ref={scrollViewRef}
                    contentContainerStyle={styles.storesHeaderContent}
                >
                    <View style={styles.storePriceHeader}>
                        <View style={styles.productHeader}>
                            <Text style={styles.productHeaderText}>Produkt</Text>
                        </View>
                        {stores.map(store => (
                            <View key={store} style={styles.storeHeader}>
                                <Text style={styles.storeHeaderText}>{store}</Text>
                                <Text style={styles.storeTotal}>
                                    {storeTotals[store] > 0 ? `${storeTotals[store].toFixed(2)} zł` : '- zł'}
                                </Text>
                            </View>
                        ))}
                        <View style={styles.actionsHeader}>
                            <Text style={styles.actionsHeaderText}>Ilość</Text>
                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* LISTA PRODUKTÓW */}
            <ScrollView
                style={styles.itemsContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.colors.primary]}
                    />
                }
            >
                {items.length === 0 ? (
                    <View style={styles.emptyItems}>
                        <Icon name="shopping-basket" size={50} color={theme.colors.disabled} />
                        <Text style={styles.emptyItemsText}>Brak produktów w liście</Text>
                        <Text style={styles.emptyItemsSubtext}>
                            Dodaj pierwszy produkt, aby zacząć porównywać ceny
                        </Text>
                        <TouchableOpacity
                            style={styles.addFirstButton}
                            onPress={() => setModalVisible(true)}
                        >
                            <Text style={styles.addFirstButtonText}>Dodaj pierwszy produkt</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    items.map(item => {
                        const itemId = item.id || item._id || '';
                        const prices = item.priceComparison?.storePrices || {};
                        const cheapestStore = item.priceComparison?.cheapestStore;
                        const cheapestPrice = item.priceComparison?.cheapestPrice || 0;

                        return (
                            <View key={itemId} style={styles.itemCard}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={true}
                                    contentContainerStyle={styles.itemRowContent}
                                >
                                    <View style={styles.itemRow}>
                                        <View style={styles.productInfo}>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <Text style={styles.itemDetails}>
                                                {item.category} • {item.unit}
                                            </Text>
                                            {item.notes && (
                                                <Text style={styles.itemNotes}>📝 {item.notes}</Text>
                                            )}
                                            {cheapestStore && cheapestPrice > 0 && (
                                                <Text style={styles.cheapestInfo}>
                                                    💰 Najtaniej: {cheapestStore} -
                                                    {(cheapestPrice * item.quantity).toFixed(2)} zł
                                                </Text>
                                            )}
                                        </View>

                                        {stores.map(store => {
                                            const price = prices[store] || 0;
                                            const isCheapest = cheapestStore === store && cheapestPrice > 0;

                                            return (
                                                <View key={store} style={styles.priceInputContainer}>
                                                    <TextInput
                                                        style={[
                                                            styles.priceInput,
                                                            isCheapest && styles.cheapestPriceInput
                                                        ]}
                                                        value={price > 0 ? price.toFixed(2) : ''}
                                                        placeholder="0.00"
                                                        placeholderTextColor={theme.colors.textSecondary}
                                                        keyboardType="decimal-pad"
                                                        onChangeText={(text) => updatePrice(itemId, store, text)}
                                                    />
                                                    <Text style={styles.priceUnit}>zł</Text>
                                                    {isCheapest && (
                                                        <Icon name="star" size={12} color={theme.colors.warning} style={styles.starIcon} />
                                                    )}
                                                </View>
                                            );
                                        })}

                                        <View style={styles.itemActions}>
                                            <View style={styles.quantityContainer}>
                                                <TouchableOpacity
                                                    style={styles.quantityButton}
                                                    onPress={() => updateQuantity(itemId, Math.max(1, item.quantity - 1))}
                                                >
                                                    <Icon name="remove" size={16} color={theme.colors.primary} />
                                                </TouchableOpacity>
                                                <Text style={styles.quantityText}>{item.quantity}</Text>
                                                <TouchableOpacity
                                                    style={styles.quantityButton}
                                                    onPress={() => updateQuantity(itemId, item.quantity + 1)}
                                                >
                                                    <Icon name="add" size={16} color={theme.colors.primary} />
                                                </TouchableOpacity>
                                            </View>

                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() => removeItem(itemId)}
                                            >
                                                <Icon name="delete" size={18} color={theme.colors.danger} />
                                                <Text style={styles.deleteButtonText}>Usuń</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </ScrollView>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* PODSUMOWANIE */}
            {items.length > 0 && (
                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>🎯 Podsumowanie</Text>
                    {bestStore && bestPrice < Infinity ? (
                        <>
                            <Text style={styles.bestStoreText}>
                                Najlepszy sklep: <Text style={styles.bestStoreName}>{bestStore}</Text>
                            </Text>
                            <Text style={styles.bestPriceText}>
                                Całkowity koszt: <Text style={styles.bestPriceValue}>{bestPrice.toFixed(2)} zł</Text>
                            </Text>
                            <Text style={styles.infoText}>
                                💡 Ceny są automatycznie zapisywane po wprowadzeniu
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.noPricesText}>
                            📝 Wprowadź ceny produktów, aby zobaczyć gdzie kupić najtaniej
                        </Text>
                    )}
                </View>
            )}

            {/* MODAL DODAWANIA PRODUKTU */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Dodaj nowy produkt</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Icon name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Nazwa produktu *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="np. Mleko, Chleb, Jajka"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={newItem.name}
                                    onChangeText={(text) => setNewItem({...newItem, name: text})}
                                />
                            </View>

                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.inputLabel}>Kategoria</Text>
                                    <View style={styles.categoryButtons}>
                                        {['Nabiał', 'Pieczywo', 'Warzywa', 'Owoce', 'Mięso', 'Inne'].map(cat => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[
                                                    styles.categoryButton,
                                                    newItem.category === cat && styles.categoryButtonActive
                                                ]}
                                                onPress={() => setNewItem({...newItem, category: cat})}
                                            >
                                                <Text style={[
                                                    styles.categoryButtonText,
                                                    newItem.category === cat && styles.categoryButtonTextActive
                                                ]}>
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Ilość</Text>
                                    <View style={styles.modalQuantityContainer}>
                                        <TouchableOpacity
                                            style={styles.modalQuantityButton}
                                            onPress={() => setNewItem({...newItem, quantity: Math.max(1, newItem.quantity - 1)})}
                                        >
                                            <Icon name="remove" size={20} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                        <Text style={styles.modalQuantityText}>{newItem.quantity}</Text>
                                        <TouchableOpacity
                                            style={styles.modalQuantityButton}
                                            onPress={() => setNewItem({...newItem, quantity: newItem.quantity + 1})}
                                        >
                                            <Icon name="add" size={20} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.modalUnitInput}
                                            value={newItem.unit}
                                            onChangeText={(text) => setNewItem({...newItem, unit: text})}
                                            placeholder="szt"
                                            placeholderTextColor={theme.colors.textSecondary}
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Uwagi (opcjonalnie)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Dodaj notatki..."
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={newItem.notes}
                                    onChangeText={(text) => setNewItem({...newItem, notes: text})}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Anuluj</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButtonModal}
                                onPress={addItem}
                            >
                                <Text style={styles.saveButtonTextModal}>Dodaj produkt</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Zamień static styles na dynamiczne
const createStyles = (theme: any, isHighContrast: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
    errorText: {
        marginTop: 10,
        color: theme.colors.danger,
        fontSize: isHighContrast ? theme.fontSize.large : theme.fontSize.large - 2,
        fontWeight: '600',
    },
    backButtonLarge: {
        marginTop: 20,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: isHighContrast ? 25 : 20,
        paddingVertical: isHighContrast ? 15 : 10,
        borderRadius: 8,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.text,
    },
    backButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: isHighContrast ? theme.fontSize.medium : theme.fontSize.medium - 2,
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
    headerInfo: {
        flex: 1,
    },
    listName: {
        fontSize: isHighContrast ? theme.fontSize.xlarge : theme.fontSize.large,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    listDescription: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.textSecondary,
        marginTop: 2,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    addItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: isHighContrast ? 20 : 15,
        paddingVertical: isHighContrast ? 12 : 8,
        borderRadius: 8,
        gap: 5,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.text,
    },
    addItemText: {
        color: 'white',
        fontSize: isHighContrast ? theme.fontSize.medium : theme.fontSize.medium - 2,
        fontWeight: '600',
    },
    actionButtonsContainer: {
        margin: 15,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.card,
        borderWidth: isHighContrast ? 3 : 1,
        borderColor: theme.colors.primary,
        padding: isHighContrast ? 20 : 15,
        borderRadius: 10,
        gap: 10,
    },
    refreshButtonText: {
        color: theme.colors.primary,
        fontSize: isHighContrast ? theme.fontSize.large : theme.fontSize.large - 2,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.card,
        marginHorizontal: 15,
        marginBottom: 15,
        padding: isHighContrast ? 20 : 15,
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
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statText: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.text,
        fontWeight: '600',
    },
    storesHeaderContainer: {
        backgroundColor: theme.colors.card,
        paddingVertical: 10,
        borderBottomWidth: isHighContrast ? 3 : 1,
        borderBottomColor: theme.colors.border,
        maxHeight: 70,
    },
    storesHeaderContent: {
        minWidth: 800,
    },
    storePriceHeader: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        minWidth: 800,
    },
    productHeader: {
        width: 200,
        justifyContent: 'center',
    },
    productHeaderText: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    storeHeader: {
        width: 120,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    storeHeaderText: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 5,
    },
    storeTotal: {
        fontSize: isHighContrast ? theme.fontSize.medium : theme.fontSize.medium - 2,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    actionsHeader: {
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionsHeaderText: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    itemsContainer: {
        flex: 1,
        padding: 15,
    },
    emptyItems: {
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyItemsText: {
        fontSize: isHighContrast ? theme.fontSize.xlarge : theme.fontSize.xlarge - 2,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyItemsSubtext: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    addFirstButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: isHighContrast ? 25 : 20,
        paddingVertical: isHighContrast ? 15 : 10,
        borderRadius: 8,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.text,
    },
    addFirstButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
    },
    itemCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        marginBottom: isHighContrast ? 15 : 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isHighContrast ? 0.2 : 0.05,
        shadowRadius: 3,
        elevation: 2,
        overflow: 'hidden',
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.border,
    },
    itemRowContent: {
        minWidth: 800,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: isHighContrast ? 20 : 15,
    },
    productInfo: {
        width: 200,
    },
    itemName: {
        fontSize: isHighContrast ? theme.fontSize.large + 2 : theme.fontSize.large,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    itemDetails: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    itemNotes: {
        fontSize: isHighContrast ? theme.fontSize.small + 1 : theme.fontSize.small - 1,
        color: theme.colors.warning,
        fontStyle: 'italic',
        marginBottom: 4,
    },
    cheapestInfo: {
        fontSize: isHighContrast ? theme.fontSize.small + 1 : theme.fontSize.small - 1,
        color: theme.colors.success,
        fontWeight: '600',
    },
    priceInputContainer: {
        width: 120,
        alignItems: 'center',
        marginHorizontal: 5,
        position: 'relative',
    },
    priceInput: {
        width: '100%',
        backgroundColor: theme.colors.background,
        borderWidth: isHighContrast ? 3 : 1,
        borderColor: theme.colors.border,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: isHighContrast ? 10 : 6,
        fontSize: isHighContrast ? theme.fontSize.medium : theme.fontSize.medium - 2,
        textAlign: 'center',
        color: theme.colors.text,
    },
    cheapestPriceInput: {
        borderColor: theme.colors.success,
        backgroundColor: isHighContrast ? theme.colors.card : '#e8f6f3',
    },
    priceUnit: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        color: theme.colors.textSecondary,
        marginTop: 4,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    starIcon: {
        position: 'absolute',
        top: -5,
        right: -5,
    },
    itemActions: {
        width: 80,
        alignItems: 'center',
        gap: isHighContrast ? 15 : 10,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 6,
        borderWidth: isHighContrast ? 3 : 1,
        borderColor: theme.colors.border,
        padding: isHighContrast ? 8 : 4,
    },
    quantityButton: {
        paddingHorizontal: isHighContrast ? 12 : 8,
        paddingVertical: isHighContrast ? 8 : 4,
    },
    quantityText: {
        fontSize: isHighContrast ? theme.fontSize.medium : theme.fontSize.medium - 2,
        fontWeight: '600',
        color: theme.colors.text,
        marginHorizontal: isHighContrast ? 12 : 8,
    },
    deleteButton: {
        alignItems: 'center',
    },
    deleteButtonText: {
        fontSize: isHighContrast ? theme.fontSize.small : theme.fontSize.small - 2,
        color: theme.colors.danger,
        marginTop: 2,
        fontWeight: '600',
    },
    summaryContainer: {
        backgroundColor: theme.colors.card,
        padding: isHighContrast ? 25 : 20,
        borderTopWidth: isHighContrast ? 3 : 1,
        borderTopColor: theme.colors.border,
    },
    summaryTitle: {
        fontSize: isHighContrast ? theme.fontSize.xlarge : theme.fontSize.xlarge - 2,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 15,
    },
    bestStoreText: {
        fontSize: isHighContrast ? theme.fontSize.large : theme.fontSize.large - 2,
        color: theme.colors.text,
        marginBottom: 5,
    },
    bestStoreName: {
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    bestPriceText: {
        fontSize: isHighContrast ? theme.fontSize.large : theme.fontSize.large - 2,
        color: theme.colors.text,
        marginBottom: 10,
    },
    bestPriceValue: {
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    infoText: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 5,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    noPricesText: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.warning,
        textAlign: 'center',
        fontStyle: 'italic',
        paddingVertical: 10,
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
        maxHeight: '80%',
        borderWidth: isHighContrast ? 4 : 0,
        borderColor: theme.colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: isHighContrast ? 3 : 0,
        borderBottomColor: theme.colors.border,
        paddingBottom: isHighContrast ? 15 : 0,
    },
    modalTitle: {
        fontSize: isHighContrast ? theme.fontSize.xlarge : theme.fontSize.xlarge - 2,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: theme.colors.background,
        borderWidth: isHighContrast ? 3 : 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        padding: isHighContrast ? 16 : 12,
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.text,
    },
    textArea: {
        height: isHighContrast ? 100 : 80,
        textAlignVertical: 'top',
    },
    inputRow: {
        flexDirection: 'row',
    },
    categoryButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryButton: {
        paddingHorizontal: isHighContrast ? 16 : 12,
        paddingVertical: isHighContrast ? 10 : 6,
        backgroundColor: theme.colors.background,
        borderRadius: 20,
        borderWidth: isHighContrast ? 3 : 1,
        borderColor: theme.colors.border,
    },
    categoryButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    categoryButtonText: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        color: theme.colors.textSecondary,
    },
    categoryButtonTextActive: {
        color: 'white',
        fontWeight: '600',
    },
    modalQuantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 10,
        borderWidth: isHighContrast ? 3 : 1,
        borderColor: theme.colors.border,
        padding: isHighContrast ? 10 : 5,
    },
    modalQuantityButton: {
        paddingHorizontal: isHighContrast ? 15 : 10,
        paddingVertical: isHighContrast ? 10 : 5,
    },
    modalQuantityText: {
        fontSize: isHighContrast ? theme.fontSize.large : theme.fontSize.large - 2,
        fontWeight: '600',
        color: theme.colors.text,
        marginHorizontal: isHighContrast ? 15 : 10,
    },
    modalUnitInput: {
        flex: 1,
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        color: theme.colors.text,
        paddingHorizontal: 8,
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
        padding: isHighContrast ? 20 : 15,
        backgroundColor: theme.colors.background,
        borderRadius: 10,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.border,
    },
    cancelButtonText: {
        color: theme.colors.textSecondary,
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: '600',
    },
    saveButtonModal: {
        flex: 1,
        alignItems: 'center',
        padding: isHighContrast ? 20 : 15,
        backgroundColor: theme.colors.primary,
        borderRadius: 10,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.text,
    },
    saveButtonTextModal: {
        color: 'white',
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: '600',
    },
});