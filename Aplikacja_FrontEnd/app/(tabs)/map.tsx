import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    Linking,
    Dimensions,
    ScrollView
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext'; // Dodaj ten import

const { width, height } = Dimensions.get('window');


import {API_BASE_URL} from "@/app/constants/Config";

interface Store {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    rating?: number;
    phoneNumber?: string;
    distanceFromUser?: number;
    formattedDistance?: string;
}

export default function MapScreen() {
    const { theme, isHighContrast } = useTheme(); // Dodaj tę linię
    const [loading, setLoading] = useState(true);
    const [locationLoading, setLocationLoading] = useState(true);
    const [radius, setRadius] = useState(5); // km
    const [userLocation, setUserLocation] = useState<Region | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const mapRef = useRef<MapView>(null);

    // Użyj motywu do tworzenia stylów
    const styles = createStyles(theme, isHighContrast);

    const defaultRegion: Region = {
        latitude: 51.7592,
        longitude: 19.4559,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    useEffect(() => {
        getUserLocation();
    }, []);

    useEffect(() => {
        if (userLocation) {
            fetchStores();
        }
    }, [userLocation, radius]);

    const getUserLocation = async () => {
        try {
            setLocationLoading(true);

            // Poproś o uprawnienia
            let { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Uprawnienia do lokalizacji',
                    'Aplikacja wymaga dostępu do lokalizacji.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setUserLocation(defaultRegion);
                                moveCameraToLocation(defaultRegion);
                            }
                        }
                    ]
                );
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const region: Region = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            };

            setUserLocation(region);
            moveCameraToLocation(region);

        } catch (error) {
            console.error('Błąd lokalizacji:', error);
            setUserLocation(defaultRegion);
            moveCameraToLocation(defaultRegion);
        } finally {
            setLocationLoading(false);
        }
    };

    const moveCameraToLocation = (region: Region) => {
        if (mapRef.current) {
            mapRef.current.animateToRegion(region, 1000);
        }
    };

    const fetchStores = async () => {
        if (!userLocation) return;

        try {
            setLoading(true);

            const response = await fetch(`${API_BASE_URL}/maps/stores/in-radius`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    radiusKm: radius,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.stores) {
                    setStores(data.stores);
                } else {
                    setStores(getSampleStores());
                }
            } else {
                setStores(getSampleStores());
            }

        } catch (error) {
            console.error('Błąd:', error);
            setStores(getSampleStores());
        } finally {
            setLoading(false);
        }
    };

    const getSampleStores = (): Store[] => {
        if (!userLocation) return [];

        const sampleStores: Store[] = [
            {
                id: '1',
                name: 'Biedronka',
                address: 'ul. Piotrkowska 193, Łódź',
                latitude: userLocation.latitude + 0.005,
                longitude: userLocation.longitude + 0.005,
                rating: 4.2,
                phoneNumber: '+48 42 630 15 67',
                distanceFromUser: 1.2,
                formattedDistance: '1.2 km'
            },
            {
                id: '2',
                name: 'Lidl',
                address: 'ul. Pabianicka 245, Łódź',
                latitude: userLocation.latitude - 0.003,
                longitude: userLocation.longitude + 0.008,
                rating: 4.4,
                phoneNumber: '+48 42 675 43 21',
                distanceFromUser: 3.5,
                formattedDistance: '3.5 km'
            },
            {
                id: '3',
                name: 'Carrefour',
                address: 'al. Piłsudskiego 22, Łódź',
                latitude: userLocation.latitude + 0.008,
                longitude: userLocation.longitude - 0.002,
                rating: 4.0,
                phoneNumber: '+48 42 631 45 67',
                distanceFromUser: 0.8,
                formattedDistance: '0.8 km'
            },
        ];

        return sampleStores;
    };

    const getStoreColor = (storeName: string): string => {
        const colors: {[key: string]: string} = {
            'Biedronka': '#E60000',
            'Lidl': '#005BA9',
            'Carrefour': '#004B9D',
            'Żabka': '#00A651',
            'Auchan': '#FF6B00',
        };
        return colors[storeName] || theme.colors.info;
    };

    const openInGoogleMaps = (store: Store) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`;
        Linking.openURL(url).catch(() => {
            Alert.alert('Błąd', 'Nie można otworzyć Google Maps');
        });
    };

    const recenterMap = () => {
        if (userLocation) {
            moveCameraToLocation(userLocation);
        }
    };

    if (loading || locationLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>
                    {locationLoading ? 'Pobieranie lokalizacji...' : 'Ładowanie mapy...'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* MAPA */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={userLocation || defaultRegion}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={true}
                showsScale={true}
                onPress={() => setSelectedStore(null)}
            >
                {userLocation && (
                    <Circle
                        center={{
                            latitude: userLocation.latitude,
                            longitude: userLocation.longitude,
                        }}
                        radius={radius * 1000} // km na metry
                        strokeWidth={isHighContrast ? 4 : 2}
                        strokeColor={isHighContrast ? theme.colors.primary : `rgba(${theme.colors.primary === '#000000' ? '0,0,0' : '52,152,219'}, 0.5)`}
                        fillColor={isHighContrast ? `rgba(${theme.colors.primary === '#000000' ? '0,0,0' : '52,152,219'}, 0.1)` : `rgba(${theme.colors.primary === '#000000' ? '0,0,0' : '52,152,219'}, 0.2)`}
                    />
                )}

                {stores.map((store) => (
                    <Marker
                        key={store.id}
                        coordinate={{
                            latitude: store.latitude,
                            longitude: store.longitude,
                        }}
                        title={store.name}
                        description={store.formattedDistance || store.address}
                        onPress={() => setSelectedStore(store)}
                    >
                        <View style={[
                            styles.marker,
                            { backgroundColor: getStoreColor(store.name) }
                        ]}>
                            <Text style={styles.markerText}>
                                {store.name.charAt(0)}
                            </Text>
                        </View>
                    </Marker>
                ))}
            </MapView>

            <View style={styles.controlsContainer}>
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={recenterMap}
                >
                    <Icon name="my-location" size={24} color={theme.colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={getUserLocation}
                >
                    <Icon name="gps-fixed" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.radiusPanel}>
                <Text style={styles.radiusTitle}>Promień: {radius} km</Text>
                <View style={styles.radiusButtons}>
                    {[1, 3, 5, 10].map((r) => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.radiusButton, radius === r && styles.activeRadiusButton]}
                            onPress={() => setRadius(r)}
                        >
                            <Text style={[styles.radiusText, radius === r && styles.activeRadiusText]}>
                                {r} km
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {selectedStore ? (
                <View style={styles.storeDetailsPanel}>
                    <View style={styles.storeHeader}>
                        <View style={[
                            styles.storeIcon,
                            { backgroundColor: getStoreColor(selectedStore.name) }
                        ]}>
                            <Text style={styles.storeIconText}>
                                {selectedStore.name.charAt(0)}
                            </Text>
                        </View>
                        <View style={styles.storeInfo}>
                            <Text style={styles.storeName}>{selectedStore.name}</Text>
                            <Text style={styles.storeAddress}>{selectedStore.address}</Text>
                            {selectedStore.formattedDistance && (
                                <Text style={styles.storeDistance}>
                                    📍 {selectedStore.formattedDistance}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={() => setSelectedStore(null)}
                        >
                            <Icon name="close" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.storeActions}>
                        {selectedStore.phoneNumber && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => Linking.openURL(`tel:${selectedStore.phoneNumber}`)}
                            >
                                <Icon name="phone" size={20} color="white" />
                                <Text style={styles.actionText}>Zadzwoń</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                            onPress={() => openInGoogleMaps(selectedStore)}
                        >
                            <Icon name="map" size={20} color="white" />
                            <Text style={styles.actionText}>Pokaż w Google Maps</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.storesList}>
                    <Text style={styles.storesTitle}>Sklepy w okolicy ({stores.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {stores.map((store) => (
                            <TouchableOpacity
                                key={store.id}
                                style={styles.storeCard}
                                onPress={() => {
                                    setSelectedStore(store);
                                    moveCameraToLocation({
                                        latitude: store.latitude,
                                        longitude: store.longitude,
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01,
                                    });
                                }}
                            >
                                <View style={[
                                    styles.storeCardIcon,
                                    { backgroundColor: getStoreColor(store.name) }
                                ]}>
                                    <Text style={styles.storeCardIconText}>
                                        {store.name.charAt(0)}
                                    </Text>
                                </View>
                                <Text style={styles.storeCardName}>{store.name}</Text>
                                <Text style={styles.storeCardDistance}>
                                    {store.formattedDistance}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
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
    map: {
        width: '100%',
        height: '70%',
    },
    controlsContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: theme.colors.card,
        borderRadius: 25,
        padding: 10,
        flexDirection: 'row',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isHighContrast ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.border,
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: isHighContrast ? 3 : 1,
        borderColor: theme.colors.border,
    },
    radiusPanel: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 100,
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: isHighContrast ? 20 : 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isHighContrast ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.border,
    },
    radiusTitle: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 10,
    },
    radiusButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    radiusButton: {
        flex: 1,
        paddingVertical: isHighContrast ? 12 : 8,
        marginHorizontal: 4,
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: isHighContrast ? 2 : 0,
        borderColor: theme.colors.border,
    },
    activeRadiusButton: {
        backgroundColor: theme.colors.primary,
        borderWidth: isHighContrast ? 2 : 0,
        borderColor: theme.colors.text,
    },
    radiusText: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    activeRadiusText: {
        color: 'white',
        fontWeight: '600',
    },
    marker: {
        width: isHighContrast ? 42 : 36,
        height: isHighContrast ? 42 : 36,
        borderRadius: isHighContrast ? 21 : 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: isHighContrast ? 4 : 2,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isHighContrast ? 0.5 : 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    markerText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: isHighContrast ? 18 : 16,
    },
    storeDetailsPanel: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isHighContrast ? 0.4 : 0.2,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: isHighContrast ? 4 : 0,
        borderColor: theme.colors.border,
    },
    storeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    storeIcon: {
        width: isHighContrast ? 60 : 50,
        height: isHighContrast ? 60 : 50,
        borderRadius: isHighContrast ? 30 : 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: 'white',
    },
    storeIconText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: isHighContrast ? 26 : 22,
    },
    storeInfo: {
        flex: 1,
    },
    storeName: {
        fontSize: isHighContrast ? theme.fontSize.large + 2 : theme.fontSize.large,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    storeAddress: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        fontWeight: isHighContrast ? '500' : 'normal',
    },
    storeDistance: {
        fontSize: isHighContrast ? theme.fontSize.medium : theme.fontSize.medium - 2,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    storeActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        paddingVertical: isHighContrast ? 15 : 12,
        borderRadius: 10,
        gap: 8,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.text,
    },
    actionText: {
        color: 'white',
        fontSize: isHighContrast ? theme.fontSize.medium : theme.fontSize.medium - 2,
        fontWeight: '600',
    },
    storesList: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    storesTitle: {
        fontSize: isHighContrast ? theme.fontSize.large : theme.fontSize.large - 2,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 10,
    },
    storeCard: {
        width: isHighContrast ? 120 : 100,
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: isHighContrast ? 20 : 15,
        marginRight: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isHighContrast ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: theme.colors.border,
    },
    storeCardIcon: {
        width: isHighContrast ? 50 : 40,
        height: isHighContrast ? 50 : 40,
        borderRadius: isHighContrast ? 25 : 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: isHighContrast ? 3 : 0,
        borderColor: 'white',
    },
    storeCardIconText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: isHighContrast ? 22 : 18,
    },
    storeCardName: {
        fontSize: isHighContrast ? theme.fontSize.medium + 2 : theme.fontSize.medium,
        fontWeight: '600',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 4,
    },
    storeCardDistance: {
        fontSize: isHighContrast ? theme.fontSize.small + 2 : theme.fontSize.small,
        color: theme.colors.primary,
        fontWeight: '600',
        textAlign: 'center',
    },
});