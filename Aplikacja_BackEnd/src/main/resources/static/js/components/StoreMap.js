// StoreMap Component - TYLKO OpenStreetMap (bez Google Maps)
const StoreMap = ({ stores, center, zoom = 14, onStoreSelect }) => {
    const [selectedStore, setSelectedStore] = React.useState(null);
    const [userLocation, setUserLocation] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [mapInstance, setMapInstance] = React.useState(null);
    const [error, setError] = React.useState(null);

    console.log('StoreMap render - stores:', stores?.length);

    // Inicjalizacja OpenStreetMap
    React.useEffect(() => {
        if (stores && stores.length > 0) {
            loadOpenStreetMap();
        }

        return () => {
            // Cleanup
            if (mapInstance && mapInstance.remove) {
                mapInstance.remove();
            }
        };
    }, [stores]);

    const loadOpenStreetMap = () => {
        console.log('Ładowanie OpenStreetMap...');

        // Sprawdź czy Leaflet jest już załadowany
        if (window.L) {
            console.log('Leaflet już załadowany');
            initOpenStreetMap();
            return;
        }

        // Dodaj CSS Leaflet
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);

        // Dodaj JS Leaflet
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';

        script.onload = () => {
            console.log('Leaflet załadowany pomyślnie');
            setTimeout(() => initOpenStreetMap(), 100);
        };

        script.onerror = (err) => {
            console.error('Nie udało się załadować Leaflet:', err);
            setError('Nie udało się załadować mapy. Sprawdź połączenie internetowe.');
        };

        document.head.appendChild(script);
    };

    const initOpenStreetMap = () => {
        console.log('Inicjalizacja OpenStreetMap...');

        if (!window.L) {
            console.error('Leaflet nie jest dostępny');
            setError('Biblioteka map nie jest dostępna');
            return;
        }

        const mapElement = document.getElementById('store-map');
        if (!mapElement) {
            console.error('Element mapy nie został znaleziony');
            setError('Element mapy nie został znaleziony');
            return;
        }

        try {
            // Usuń istniejącą mapę jeśli jest
            if (mapInstance && mapInstance.remove) {
                mapInstance.remove();
            }

            // Ustaw domyślne centrum (Warszawa)
            let mapCenter = [52.2297, 21.0122];

            // Jeśli mamy sklepy z koordynatami, użyj pierwszego
            if (stores && stores.length > 0) {
                const storeWithCoords = stores.find(s => s.latitude && s.longitude);
                if (storeWithCoords) {
                    mapCenter = [storeWithCoords.latitude, storeWithCoords.longitude];
                }
            }

            console.log('Centrum mapy:', mapCenter);

            const map = window.L.map('store-map').setView(mapCenter, zoom);
            setMapInstance(map);

            // Dodaj tile layer z OpenStreetMap
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            }).addTo(map);

            // Dodaj znaczniki dla sklepów
            addStoreMarkers(map);

            // Dodaj znacznik dla lokalizacji użytkownika
            if (userLocation) {
                addUserMarker(map);
            }

        } catch (err) {
            console.error('Błąd inicjalizacji mapy:', err);
            setError('Błąd podczas tworzenia mapy: ' + err.message);
        }
    };

    const addStoreMarkers = (map) => {
        if (!stores || stores.length === 0) return;

        stores.forEach(store => {
            if (store.latitude && store.longitude) {
                // Stwórz ikonę dla sklepu
                const storeIcon = window.L.divIcon({
                    html: '<div style="background-color: red; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">S</div>',
                    className: 'store-marker',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });

                const marker = window.L.marker([store.latitude, store.longitude], {
                    icon: storeIcon,
                    title: store.name
                }).addTo(map);

                // Dodaj popup
                const popupContent = `
                    <div style="padding: 10px; min-width: 200px;">
                        <h6 style="margin: 0 0 5px 0; font-weight: bold;">${store.name}</h6>
                        <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">${store.address || ''}</p>
                        ${store.phoneNumber ? `<p style="margin: 0 0 5px 0; font-size: 12px;">📞 ${store.phoneNumber}</p>` : ''}
                        ${store.rating ? `<p style="margin: 0 0 5px 0; font-size: 12px;">⭐ ${store.rating}/5</p>` : ''}
                        <button onclick="selectStoreOnMap('${store.id}')" 
                                style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 12px; margin-top: 5px;">
                            Wybierz ten sklep
                        </button>
                    </div>
                `;

                marker.bindPopup(popupContent);

                marker.on('click', () => {
                    setSelectedStore(store);
                    if (onStoreSelect) {
                        onStoreSelect(store);
                    }
                });
            }
        });
    };

    const addUserMarker = (map) => {
        const userIcon = window.L.divIcon({
            html: '<div style="background-color: #007bff; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">📍</div>',
            className: 'user-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = window.L.marker([userLocation.lat, userLocation.lng], {
            icon: userIcon,
            title: 'Twoja lokalizacja'
        }).addTo(map);

        marker.bindPopup('<b>Twoja lokalizacja</b>');
    };

    const getUserLocation = () => {
        console.log('Pobieranie lokalizacji użytkownika...');

        if (!navigator.geolocation) {
            alert('Twoja przeglądarka nie wspiera geolokalizacji.');
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Lokalizacja uzyskana:', position.coords);

                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                setUserLocation(location);

                // Przesuń mapę do lokalizacji użytkownika
                if (mapInstance) {
                    mapInstance.setView([location.lat, location.lng], 15);
                    addUserMarker(mapInstance);
                }

                setLoading(false);

                // Automatycznie znajdź sklepy w okolicy
                findStoresNearby(location);
            },
            (error) => {
                console.error('Błąd geolokalizacji:', error);
                setLoading(false);

                // Przyjazne komunikaty błędów
                let errorMessage = 'Nie można uzyskać Twojej lokalizacji. ';

                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Odmówiono dostępu do lokalizacji. Sprawdź uprawnienia przeglądarki.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Informacje o lokalizacji są niedostępne.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Przekroczono czas oczekiwania na lokalizację.';
                        break;
                    default:
                        errorMessage += 'Nieznany błąd: ' + error.message;
                }

                alert(errorMessage);
                setError(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const findStoresNearby = async (location = userLocation) => {
        if (!location) {
            alert('Najpierw znajdź swoją lokalizację.');
            return;
        }

        setLoading(true);

        try {
            console.log('Szukanie sklepów w okolicy:', location);

            // WYŁĄCZONE - backend nie ma jeszcze tej funkcjonalności
            // const response = await fetch('/api/maps/find-stores', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({
            //         latitude: location.lat,
            //         longitude: location.lng,
            //         radius: 5000,
            //         type: 'supermarket'
            //     })
            // });
            //
            // const data = await response.json();
            // console.log('Znalezione sklepy:', data);

            alert('Funkcja wyszukiwania sklepów w okolicy jest w budowie. Skontaktuj się z administratorem.');

        } catch (error) {
            console.error('Błąd wyszukiwania sklepów:', error);
            alert('Nie udało się wyszukać sklepów w okolicy.');
        } finally {
            setLoading(false);
        }
    };

    const centerOnStore = (store) => {
        if (mapInstance && store.latitude && store.longitude) {
            mapInstance.setView([store.latitude, store.longitude], 16);
        }
    };

    // Globalna funkcja do wybierania sklepu z popupu
    React.useEffect(() => {
        window.selectStoreOnMap = (storeId) => {
            const store = stores?.find(s => s.id === storeId);
            if (store) {
                setSelectedStore(store);
                centerOnStore(store);
                if (onStoreSelect) {
                    onStoreSelect(store);
                }
            }
        };

        return () => {
            window.selectStoreOnMap = null;
        };
    }, [stores, onStoreSelect]);

    return (
        <div className="store-map-container">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>🗺️ Mapa Sklepów (OpenStreetMap)</h4>
                <div className="btn-group">
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={getUserLocation}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Szukam...
                            </>
                        ) : '📍 Znajdź mnie'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-warning mb-3">
                    {error}
                </div>
            )}

            <div id="store-map" style={{
                height: '400px',
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #ddd',
                backgroundColor: '#f8f9fa' // Tło na czas ładowania
            }}>
                {(!stores || stores.length === 0) && (
                    <div className="h-100 d-flex align-items-center justify-content-center">
                        <div className="text-center">
                            <div className="spinner-border text-primary mb-3" role="status">
                                <span className="visually-hidden">Ładowanie...</span>
                            </div>
                            <p className="text-muted">Ładowanie mapy...</p>
                        </div>
                    </div>
                )}
            </div>

            {selectedStore && (
                <div className="card mt-3">
                    <div className="card-body">
                        <h5>{selectedStore.name}</h5>
                        <p className="text-muted mb-2">{selectedStore.address}</p>
                        <div className="row">
                            {selectedStore.phoneNumber && (
                                <div className="col-12 mb-1">
                                    <small>📞 {selectedStore.phoneNumber}</small>
                                </div>
                            )}
                            {selectedStore.website && (
                                <div className="col-12 mb-1">
                                    <small>🌐 <a href={selectedStore.website} target="_blank" rel="noopener noreferrer">Strona internetowa</a></small>
                                </div>
                            )}
                            {selectedStore.rating && (
                                <div className="col-12">
                                    <small>⭐ {selectedStore.rating}/5 ({selectedStore.userRatingsCount || 0} opinii)</small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {stores && stores.length > 0 ? (
                <div className="mt-3">
                    <h6>Lista sklepów ({stores.length})</h6>
                    <div className="list-group" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {stores.map(store => (
                            <div
                                key={store.id}
                                className={`list-group-item list-group-item-action ${selectedStore?.id === store.id ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedStore(store);
                                    centerOnStore(store);
                                    if (onStoreSelect) {
                                        onStoreSelect(store);
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="d-flex w-100 justify-content-between align-items-center">
                                    <h6 className="mb-1">{store.name}</h6>
                                    {store.rating && (
                                        <small className="badge bg-warning text-dark">⭐ {store.rating}</small>
                                    )}
                                </div>
                                <p className="mb-1 small text-muted">{store.address}</p>
                                {store.phoneNumber && (
                                    <small className="text-muted">📞 {store.phoneNumber}</small>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="alert alert-info mt-3">
                    <h6>Brak sklepów do wyświetlenia</h6>
                    <p className="mb-0">Dodaj sklepy do bazy danych, aby zobaczyć je na mapie.</p>
                </div>
            )}

            <style>{`
                .store-marker, .user-marker {
                    background: none !important;
                    border: none !important;
                }
                .leaflet-popup-content {
                    margin: 13px 19px;
                }
                .leaflet-popup-content button {
                    width: 100%;
                }
                #store-map {
                    min-height: 400px;
                }
            `}</style>
        </div>
    );
};

// Make it globally available
window.StoreMap = StoreMap;