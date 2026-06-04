// StoreMapAdvanced Component - z zaznaczaniem miejsca i promieniem
const StoreMapAdvanced = ({ stores, onStoreSelect }) => {
    const [selectedStore, setSelectedStore] = React.useState(null);
    const [mapInstance, setMapInstance] = React.useState(null);
    const [searchCenter, setSearchCenter] = React.useState(null);
    const [radius, setRadius] = React.useState(5); // km
    const [searchResults, setSearchResults] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [circleLayer, setCircleLayer] = React.useState(null);
    const [centerMarker, setCenterMarker] = React.useState(null);
    const [storeMarkers, setStoreMarkers] = React.useState([]);
    const [showAllStores, setShowAllStores] = React.useState(true);
    const [useCurrentLocation, setUseCurrentLocation] = React.useState(false);
    const [searchMode, setSearchMode] = React.useState('database'); // 'database' lub 'osm'
    const [osmResults, setOsmResults] = React.useState([]);
    const [searchQuery, setSearchQuery] = React.useState('supermarket');

    console.log('StoreMapAdvanced render - stores:', stores?.length);

    // Inicjalizacja mapy
    React.useEffect(() => {
        loadOpenStreetMap();

        return () => {
            // Cleanup
            if (mapInstance && mapInstance.remove) {
                mapInstance.remove();
            }
        };
    }, []);

    // Gdy zmieni się centrum lub promień, aktualizuj koło
    React.useEffect(() => {
        if (searchCenter && circleLayer && mapInstance) {
            updateCircleRadius();
        }
    }, [radius]);

    const loadOpenStreetMap = () => {
        if (window.L) {
            initOpenStreetMap();
            return;
        }

        // Dodaj CSS Leaflet
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.crossOrigin = '';
        document.head.appendChild(link);

        // Dodaj JS Leaflet
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.crossOrigin = '';
        script.onload = () => setTimeout(() => initOpenStreetMap(), 100);
        document.head.appendChild(script);
    };

    const initOpenStreetMap = () => {
        if (!window.L) {
            console.error('Leaflet nie jest dostępny');
            return;
        }

        const mapElement = document.getElementById('store-map-advanced');
        if (!mapElement) return;

        // Ustaw centrum na Łódź domyślnie
        const defaultCenter = [51.7687, 19.4568]; // Łódź

        const map = window.L.map('store-map-advanced').setView(defaultCenter, 12);
        setMapInstance(map);

        // Dodaj tile layer
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(map);

        // Dodaj wszystkie sklepy na początku
        addAllStoreMarkers(map);

        // Dodaj obsługę kliknięcia na mapę
        map.on('click', (e) => {
            console.log('Kliknięto na mapie:', e.latlng);
            setSearchCenter({
                lat: e.latlng.lat,
                lng: e.latlng.lng
            });
            updateCenterMarker(map, e.latlng);
            updateCircle(map, e.latlng);
        });

        // Dodaj tylko przycisk lokalizacji na mapie
        addLocationButton(map);
    };

    const addLocationButton = (map) => {
        // Przycisk do ustawiania lokalizacji użytkownika
        const locateButton = window.L.control({ position: 'topleft' });
        locateButton.onAdd = () => {
            const div = window.L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.innerHTML = `
                <button class="leaflet-control-locate" 
                        style="
                            width: 34px;
                            height: 34px;
                            background: white;
                            border: 2px solid rgba(0,0,0,0.2);
                            border-radius: 4px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 16px;
                        "
                        title="Znajdź moją lokalizację">
                    📍
                </button>
            `;

            window.L.DomEvent.on(div, 'click', (e) => {
                e.stopPropagation();
                getUserLocation();
            });

            return div;
        };
        locateButton.addTo(map);
    };

    const addAllStoreMarkers = (map) => {
        if (!stores || !map) return;

        const markers = [];

        console.log('Dodawanie markerów dla sklepów:', stores.length);

        stores.forEach(store => {
            if (store.latitude && store.longitude) {
                console.log('Dodaję marker dla:', store.name, store.latitude, store.longitude);
                const marker = createStoreMarker(store, map);
                markers.push(marker);
            } else {
                console.warn('Sklep bez koordynatów:', store.name);
            }
        });

        console.log('Dodano markerów:', markers.length);
        setStoreMarkers(markers);
    };

    const createStoreMarker = (store, map) => {
        const storeIcon = window.L.divIcon({
            html: `
                <div style="
                    background-color: ${store.distanceFromUser ? '#28a745' : 'red'};
                    width: 28px; 
                    height: 28px; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    color: white; 
                    font-weight: bold;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    font-size: 12px;
                ">
                    ${store.name.charAt(0)}
                </div>
            `,
            className: 'store-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const marker = window.L.marker([store.latitude, store.longitude], {
            icon: storeIcon,
            title: store.name
        }).addTo(map);

        // Popup z informacjami
        const popupContent = createPopupContent(store);
        marker.bindPopup(popupContent);

        marker.on('click', () => {
            console.log('Kliknięto marker:', store.name);
            setSelectedStore(store);
            onStoreSelect && onStoreSelect(store);
        });

        return marker;
    };

    const createPopupContent = (store) => {
        let content = `
            <div style="padding: 10px; min-width: 220px;">
                <h6 style="margin: 0 0 8px 0; font-weight: bold; color: #333;">${store.name}</h6>
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #666;">${store.address || ''}</p>
        `;

        if (store.distanceFromUser) {
            const distance = store.getFormattedDistance ?
                store.getFormattedDistance() :
                `${store.distanceFromUser.toFixed(1)} km`;
            content += `<p style="margin: 0 0 6px 0; font-size: 12px; color: #28a745;">
                <strong>📏 ${distance}</strong> od centrum wyszukiwania
            </p>`;
        }

        if (store.rating) {
            content += `<p style="margin: 0 0 6px 0; font-size: 12px;">
                ⭐ ${store.rating}/5 (${store.userRatingsCount || 0} opinii)
            </p>`;
        }

        if (store.phoneNumber) {
            content += `<p style="margin: 0 0 8px 0; font-size: 12px;">📞 ${store.phoneNumber}</p>`;
        }

        content += `
            <button onclick="window.selectAdvancedStore && window.selectAdvancedStore('${store.id}')" 
                    style="
                        background: #007bff; 
                        color: white; 
                        border: none; 
                        padding: 6px 12px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        font-size: 12px; 
                        margin-top: 5px;
                        width: 100%;
                    ">
                Wybierz ten sklep
            </button>
        </div>`;

        return content;
    };

    const updateCenterMarker = (map, latlng) => {
        // Usuń stary marker
        if (centerMarker) {
            map.removeLayer(centerMarker);
        }

        // Stwórz nowy marker centrum
        const newMarker = window.L.marker(latlng, {
            icon: window.L.divIcon({
                html: `
                    <div style="
                        background-color: #007bff;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                        border: 3px solid white;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                    ">
                        <div style="font-size: 20px;">📍</div>
                    </div>
                `,
                className: 'center-marker',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            }),
            draggable: true,
            title: 'Centrum wyszukiwania'
        }).addTo(map);

        newMarker.bindPopup(`
            <div style="padding: 8px;">
                <strong>Centrum wyszukiwania</strong><br>
                <small>Szerokość: ${latlng.lat.toFixed(4)}</small><br>
                <small>Długość: ${latlng.lng.toFixed(4)}</small><br>
                <small>Promień: ${radius} km</small>
            </div>
        `);

        // Obsługa przeciągania markera
        newMarker.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            console.log('Przeciągnięto marker do:', newPos);
            setSearchCenter({ lat: newPos.lat, lng: newPos.lng });
            updateCircle(map, newPos);
        });

        setCenterMarker(newMarker);
    };

    const updateCircle = (map, latlng) => {
        // Usuń stare koło
        if (circleLayer) {
            map.removeLayer(circleLayer);
        }

        // Stwórz nowe koło promienia
        const newCircle = window.L.circle(latlng, {
            color: '#007bff',
            fillColor: '#007bff',
            fillOpacity: 0.1,
            weight: 2,
            radius: radius * 1000 // metry
        }).addTo(map);

        console.log('Utworzono koło o promieniu:', radius, 'km', radius * 1000, 'm');

        // Dodaj popup do koła
        newCircle.bindPopup(`
            <div style="padding: 8px; text-align: center;">
                <strong>Obszar wyszukiwania</strong><br>
                <small>Promień: ${radius} km</small><br>
                <small>Powierzchnia: ${(Math.PI * radius * radius).toFixed(1)} km²</small>
            </div>
        `);

        setCircleLayer(newCircle);
    };

    // Funkcja do aktualizacji promienia koła
    const updateCircleRadius = () => {
        if (circleLayer && searchCenter) {
            console.log('Aktualizacja promienia koła do:', radius, 'km', radius * 1000, 'm');
            circleLayer.setRadius(radius * 1000);

            // Zaktualizuj popup
            circleLayer.setPopupContent(`
                <div style="padding: 8px; text-align: center;">
                    <strong>Obszar wyszukiwania</strong><br>
                    <small>Promień: ${radius} km</small><br>
                    <small>Powierzchnia: ${(Math.PI * radius * radius).toFixed(1)} km²</small>
                </div>
            `);
        }
    };

    const getUserLocation = () => {
        if (!navigator.geolocation) {
            alert('Twoja przeglądarka nie wspiera geolokalizacji.');
            return;
        }

        setLoading(true);
        setUseCurrentLocation(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                console.log('Znaleziono lokalizację:', location);
                setSearchCenter(location);

                if (mapInstance) {
                    mapInstance.setView([location.lat, location.lng], 13);
                    setTimeout(() => {
                        updateCenterMarker(mapInstance, location);
                        updateCircle(mapInstance, location);
                    }, 100);
                }

                setLoading(false);
            },
            (error) => {
                console.error('Błąd geolokalizacji:', error);
                setLoading(false);
                setUseCurrentLocation(false);
                alert('Nie można uzyskać lokalizacji. Sprawdź uprawnienia przeglądarki.');
            }
        );
    };

    const findStoresInRadius = async () => {
        if (!searchCenter) {
            alert('Najpierw ustaw centrum wyszukiwania (kliknij na mapę).');
            return;
        }

        console.log('Szukanie sklepów w promieniu:', searchCenter, radius);

        setLoading(true);

        try {
            const response = await fetch('/api/maps/stores/in-radius', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    latitude: searchCenter.lat,
                    longitude: searchCenter.lng,
                    radiusKm: radius
                })
            });

            console.log('Odpowiedź z API:', response);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Znalezione sklepy:', data);

            setSearchResults(data.stores || []);

            // Zaktualizuj markery na mapie
            updateSearchResultsOnMap(data.stores);

        } catch (error) {
            console.error('Błąd wyszukiwania sklepów:', error);
            alert('Nie udało się wyszukać sklepów. Spróbuj ponownie.');

            // Fallback: użyj przykładowych sklepów
            const sampleStores = getSampleStores();
            setSearchResults(sampleStores);
            updateSearchResultsOnMap(sampleStores);
        } finally {
            setLoading(false);
        }
    };

    // NOWA FUNKCJA: Wyszukaj sklepy w OpenStreetMap
    const findStoresInOpenStreetMap = async () => {
        if (!searchCenter) {
            alert('Najpierw ustaw centrum wyszukiwania (kliknij na mapę).');
            return;
        }

        setLoading(true);
        console.log('Szukanie sklepów w OSM:', searchCenter, radius, searchQuery);

        try {
            const response = await fetch('/api/maps/search-osm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    latitude: searchCenter.lat,
                    longitude: searchCenter.lng,
                    radiusKm: radius,
                    query: searchQuery || 'supermarket',
                    method: 'nominatim'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Znalezione sklepy z OSM:', data);

            setOsmResults(data.stores || []);

            // Zaktualizuj markery na mapie z OSM wynikami
            updateMapWithOsmResults(data.stores);

        } catch (error) {
            console.error('Błąd wyszukiwania w OSM:', error);

            // Fallback: użyj przykładowych sklepów z OSM
            const sampleOsmStores = generateSampleOsmStores();
            setOsmResults(sampleOsmStores);
            updateMapWithOsmResults(sampleOsmStores);

            alert('Używam przykładowych danych. Prawdziwe wyszukiwanie nie działa.');
        } finally {
            setLoading(false);
        }
    };

    // Funkcja do aktualizacji mapy wynikami OSM
    const updateMapWithOsmResults = (osmStores) => {
        if (!mapInstance || !osmStores) return;

        console.log('Aktualizacja mapy wynikami OSM:', osmStores.length);

        // Usuń wszystkie stare markery
        storeMarkers.forEach(marker => {
            if (marker && marker.remove) {
                mapInstance.removeLayer(marker);
            }
        });

        // Dodaj markery dla sklepów OSM
        const newMarkers = osmStores.map(store => {
            return createOsmStoreMarker(store, mapInstance);
        });

        setStoreMarkers(newMarkers);
    };

    // Tworzenie markera dla sklepu OSM
    const createOsmStoreMarker = (store, map) => {
        const storeIcon = window.L.divIcon({
            html: `
                <div style="
                    background-color: #28a745;
                    width: 30px; 
                    height: 30px; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    color: white; 
                    font-weight: bold;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    font-size: 10px;
                ">
                    ${store.name.substring(0, 2)}
                </div>
            `,
            className: 'osm-store-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = window.L.marker([store.latitude, store.longitude], {
            icon: storeIcon,
            title: store.name
        }).addTo(map);

        const popupContent = createOsmPopupContent(store);
        marker.bindPopup(popupContent);

        marker.on('click', () => {
            setSelectedStore(store);
            onStoreSelect && onStoreSelect(store);
        });

        return marker;
    };

    const createOsmPopupContent = (store) => {
        let content = `
            <div style="padding: 10px; min-width: 220px;">
                <h6 style="margin: 0 0 8px 0; font-weight: bold; color: #333;">${store.name}</h6>
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #666;">${store.address || 'Brak adresu'}</p>
        `;

        if (store.distanceFromUser) {
            const distance = store.formattedDistance || `${store.distanceFromUser.toFixed(1)} km`;
            content += `<p style="margin: 0 0 6px 0; font-size: 12px; color: #28a745;">
                <strong>📏 ${distance}</strong> od centrum
            </p>`;
        }

        if (store.rating) {
            content += `<p style="margin: 0 0 6px 0; font-size: 12px;">
                ⭐ ${store.rating}/5
            </p>`;
        }

        content += `
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #666;">
                <em>Źródło: OpenStreetMap</em>
            </p>
            <button onclick="window.selectOsmStore && window.selectOsmStore('${store.id}')" 
                    style="
                        background: #28a745; 
                        color: white; 
                        border: none; 
                        padding: 6px 12px; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        font-size: 12px; 
                        margin-top: 5px;
                        width: 100%;
                    ">
                Wybierz ten sklep
            </button>
        </div>`;

        return content;
    };

    // Przykładowe dane dla fallback
    const getSampleStores = () => {
        const center = searchCenter || { lat: 51.7687, lng: 19.4568 };

        return [
            {
                id: '1',
                name: 'Biedronka (przykładowa)',
                address: 'ul. Przykładowa 1, Łódź',
                latitude: center.lat + 0.003,
                longitude: center.lng + 0.003,
                distanceFromUser: 0.5,
                rating: 4.2,
                phoneNumber: '+48 123 456 789'
            },
            {
                id: '2',
                name: 'Lidl (przykładowy)',
                address: 'ul. Testowa 15, Łódź',
                latitude: center.lat - 0.002,
                longitude: center.lng + 0.001,
                distanceFromUser: 0.8,
                rating: 4.5,
                phoneNumber: '+48 987 654 321'
            }
        ];
    };

    // Przykładowe dane OSM dla fallback
    const generateSampleOsmStores = () => {
        const center = searchCenter || { lat: 51.7687, lng: 19.4568 };

        return [
            {
                id: 'osm_1',
                name: 'Biedronka (OSM)',
                address: 'Znaleziona przez OpenStreetMap',
                latitude: center.lat + 0.005,
                longitude: center.lng + 0.005,
                distanceFromUser: 0.8,
                formattedDistance: '0.8 km',
                type: 'supermarket',
                rating: 4.0
            },
            {
                id: 'osm_2',
                name: 'Lidl (OSM)',
                address: 'Znaleziona przez OpenStreetMap',
                latitude: center.lat - 0.003,
                longitude: center.lng + 0.002,
                distanceFromUser: 1.2,
                formattedDistance: '1.2 km',
                type: 'supermarket',
                rating: 4.2
            },
            {
                id: 'osm_3',
                name: 'Żabka (OSM)',
                address: 'Znaleziona przez OpenStreetMap',
                latitude: center.lat + 0.002,
                longitude: center.lng - 0.004,
                distanceFromUser: 0.5,
                formattedDistance: '500 m',
                type: 'convenience',
                rating: 3.9
            }
        ];
    };

    const updateSearchResultsOnMap = (foundStores) => {
        if (!mapInstance || !foundStores) return;

        console.log('Aktualizacja markerów na mapie:', foundStores.length);

        // Usuń wszystkie stare markery
        storeMarkers.forEach(marker => {
            if (marker && marker.remove) {
                mapInstance.removeLayer(marker);
            }
        });

        // Dodaj nowe markery dla znalezionych sklepów
        const newMarkers = foundStores.map(store => {
            return createStoreMarker(store, mapInstance);
        });

        console.log('Dodano nowe markery:', newMarkers.length);
        setStoreMarkers(newMarkers);
    };

    // Funkcja do zmiany widoczności sklepów
    const updateStoreVisibility = (showAll) => {
        if (!mapInstance) return;

        console.log('Zmiana widoczności sklepów:', showAll ? 'wszystkie' : 'tylko wyniki');

        if (showAll) {
            // Pokaż wszystkie sklepy z bazy
            addAllStoreMarkers(mapInstance);
        } else if (searchMode === 'database' && searchResults.length > 0) {
            // Pokaż tylko wyniki wyszukiwania z bazy
            updateSearchResultsOnMap(searchResults);
        } else if (searchMode === 'osm' && osmResults.length > 0) {
            // Pokaż tylko wyniki z OSM
            updateMapWithOsmResults(osmResults);
        }
    };

    const resetSearch = () => {
        console.log('Resetowanie wyszukiwania');
        setSearchCenter(null);
        setSearchResults([]);
        setOsmResults([]);
        setRadius(5);
        setShowAllStores(true);
        setUseCurrentLocation(false);
        setSelectedStore(null);
        setSearchQuery('supermarket');

        if (mapInstance) {
            // Usuń marker centrum
            if (centerMarker) {
                mapInstance.removeLayer(centerMarker);
                setCenterMarker(null);
            }

            // Usuń koło
            if (circleLayer) {
                mapInstance.removeLayer(circleLayer);
                setCircleLayer(null);
            }

            // Pokaż wszystkie sklepy
            addAllStoreMarkers(mapInstance);
        }
    };

    // Globalna funkcja do wybierania sklepu
    React.useEffect(() => {
        window.selectAdvancedStore = (storeId) => {
            console.log('Wywołano selectAdvancedStore z ID:', storeId);
            let store;

            if (searchMode === 'database') {
                store = searchResults.find(s => s.id === storeId) ||
                    stores.find(s => s.id === storeId);
            } else {
                store = osmResults.find(s => s.id === storeId);
            }

            if (store) {
                setSelectedStore(store);
                onStoreSelect && onStoreSelect(store);

                // Przesuń mapę do sklepu
                if (mapInstance && store.latitude && store.longitude) {
                    mapInstance.setView([store.latitude, store.longitude], 15);
                }
            }
        };

        window.selectOsmStore = (storeId) => {
            console.log('Wywołano selectOsmStore z ID:', storeId);
            const store = osmResults.find(s => s.id === storeId);
            if (store) {
                setSelectedStore(store);
                onStoreSelect && onStoreSelect(store);

                // Przesuń mapę do sklepu
                if (mapInstance && store.latitude && store.longitude) {
                    mapInstance.setView([store.latitude, store.longitude], 15);
                }
            }
        };

        return () => {
            window.selectAdvancedStore = null;
            window.selectOsmStore = null;
        };
    }, [searchResults, osmResults, stores, onStoreSelect, mapInstance, searchMode]);

    return (
        <div className="store-map-advanced-container">
            <div className="row">
                {/* Panel kontrolny - obok mapy */}
                <div className="col-md-4 mb-3">
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0">🔍 Panel wyszukiwania</h5>
                        </div>
                        <div className="card-body">
                            {/* Wybór źródła danych */}
                            <div className="mb-3">
                                <label className="form-label"><strong>Źródło danych:</strong></label>
                                <div className="btn-group w-100" role="group">
                                    <button
                                        type="button"
                                        className={`btn ${searchMode === 'database' ? 'btn-primary' : 'btn-outline-primary'}`}
                                        onClick={() => setSearchMode('database')}
                                    >
                                        Moja baza
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn ${searchMode === 'osm' ? 'btn-success' : 'btn-outline-success'}`}
                                        onClick={() => setSearchMode('osm')}
                                    >
                                        OpenStreetMap
                                    </button>
                                </div>
                                <small className="text-muted">
                                    {searchMode === 'database'
                                        ? 'Wyszukiwanie w Twojej bazie danych'
                                        : 'Wyszukiwanie w czasie rzeczywistym z OpenStreetMap'}
                                </small>
                            </div>

                            {/* Pole wyszukiwania dla OSM */}
                            {searchMode === 'osm' && (
                                <div className="mb-3">
                                    <label className="form-label"><strong>Szukaj:</strong></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="np. supermarket, biedronka, lidl..."
                                    />
                                    <small className="text-muted">
                                        Wpisz typ sklepu lub nazwę sieci
                                    </small>
                                </div>
                            )}

                            {/* Status */}
                            <div className="mb-3">
                                <h6>Status wyszukiwania</h6>
                                {searchCenter ? (
                                    <div className="alert alert-info p-2">
                                        <small>
                                            <strong>Centrum:</strong><br/>
                                            Szerokość: {searchCenter.lat.toFixed(4)}<br/>
                                            Długość: {searchCenter.lng.toFixed(4)}<br/>
                                            <strong>Promień:</strong> {radius} km
                                        </small>
                                    </div>
                                ) : (
                                    <div className="alert alert-warning p-2">
                                        <small>Kliknij na mapę, aby ustawić centrum wyszukiwania</small>
                                    </div>
                                )}
                            </div>

                            {/* Kontrolka promienia */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <strong>Promień wyszukiwania:</strong> {radius} km
                                </label>
                                <input
                                    type="range"
                                    className="form-range"
                                    min="1"
                                    max="20"
                                    step="0.5"
                                    value={radius}
                                    onChange={(e) => {
                                        const newRadius = parseFloat(e.target.value);
                                        setRadius(newRadius);
                                        console.log('Zmiana promienia na:', newRadius);
                                    }}
                                />
                                <div className="d-flex justify-content-between small text-muted">
                                    <span>1 km</span>
                                    <span>20 km</span>
                                </div>
                            </div>

                            {/* Przyciski akcji */}
                            <div className="mb-3">
                                <button
                                    className="btn btn-success w-100 mb-2"
                                    onClick={searchMode === 'database' ? findStoresInRadius : findStoresInOpenStreetMap}
                                    disabled={!searchCenter || loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Szukam...
                                        </>
                                    ) : searchMode === 'database' ? '🔍 Szukaj w bazie' : '🌍 Szukaj w OSM'}
                                </button>

                                <button
                                    className="btn btn-outline-primary w-100 mb-2"
                                    onClick={getUserLocation}
                                    disabled={loading}
                                >
                                    📍 Użyj mojej lokalizacji
                                </button>

                                <button
                                    className="btn btn-outline-secondary w-100"
                                    onClick={resetSearch}
                                >
                                    🔄 Resetuj wyszukiwanie
                                </button>
                            </div>

                            {/* Toggle pokaż wszystkie */}
                            <div className="mb-3">
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="showAllToggle"
                                        checked={showAllStores}
                                        onChange={(e) => {
                                            const show = e.target.checked;
                                            setShowAllStores(show);
                                            updateStoreVisibility(show);
                                        }}
                                    />
                                    <label className="form-check-label" htmlFor="showAllToggle">
                                        Pokaż wszystkie sklepy
                                    </label>
                                </div>
                            </div>

                            {/* Statystyki */}
                            <div className="mt-3">
                                <h6>📊 Statystyki</h6>
                                <div className="row text-center">
                                    <div className="col-6">
                                        <div className="display-6 text-primary">
                                            {stores?.length || 0}
                                        </div>
                                        <small className="text-muted">Moja baza</small>
                                    </div>
                                    <div className="col-6">
                                        <div className="display-6 text-success">
                                            {searchMode === 'database' ? searchResults.length : osmResults.length}
                                        </div>
                                        <small className="text-muted">
                                            {searchMode === 'database' ? 'W promieniu' : 'Znalezione w OSM'}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lista znalezionych sklepów */}
                    <div className="card shadow-sm mt-3">
                        <div className="card-header bg-success text-white">
                            <h6 className="mb-0">
                                {searchMode === 'database' ? '🏪 Znalezione sklepy' : '🌍 Sklepy z OSM'}
                                ({searchMode === 'database' ? searchResults.length : osmResults.length})
                            </h6>
                        </div>
                        <div className="card-body p-0" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {loading ? (
                                <div className="text-center p-3">
                                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                                        <span className="visually-hidden">Ładowanie...</span>
                                    </div>
                                    <p className="mt-2 small">Wyszukiwanie sklepów...</p>
                                </div>
                            ) : (searchMode === 'database' ? searchResults : osmResults).length > 0 ? (
                                <div className="list-group list-group-flush">
                                    {(searchMode === 'database' ? searchResults : osmResults).map(store => (
                                        <div
                                            key={store.id}
                                            className={`list-group-item list-group-item-action p-2 ${selectedStore?.id === store.id ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedStore(store);
                                                if (mapInstance) {
                                                    mapInstance.setView([store.latitude, store.longitude], 15);
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="d-flex justify-content-between align-items-center">
                                                <strong className="small">{store.name}</strong>
                                                {store.distanceFromUser && (
                                                    <span className="badge bg-success">
                                                        {store.formattedDistance ||
                                                            (store.getFormattedDistance ?
                                                                store.getFormattedDistance() :
                                                                store.distanceFromUser.toFixed(1) + ' km')}
                                                    </span>
                                                )}
                                            </div>
                                            <small className="text-muted d-block">
                                                {store.address?.split(',')[0] || 'Brak adresu'}
                                            </small>
                                            {store.rating && (
                                                <small className="text-warning">⭐ {store.rating}</small>
                                            )}
                                            {searchMode === 'osm' && (
                                                <small className="text-info">🌍 OSM</small>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : searchCenter ? (
                                <div className="alert alert-warning m-2 p-2">
                                    <small>
                                        {searchMode === 'database'
                                            ? 'Brak sklepów w wybranym promieniu.'
                                            : 'Brak sklepów w OpenStreetMap. Spróbuj zmienić zapytanie.'}
                                    </small>
                                </div>
                            ) : (
                                <div className="alert alert-secondary m-2 p-2">
                                    <small>Ustaw centrum i promień, aby wyszukać sklepy</small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mapa - większa kolumna */}
                <div className="col-md-8">
                    <div id="store-map-advanced" style={{
                        height: '600px',
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid #ddd'
                    }}></div>

                    {/* Wybrany sklep - pod mapą */}
                    {selectedStore && (
                        <div className="card mt-3 shadow-sm">
                            <div className="card-header bg-info text-white">
                                <h6 className="mb-0">🎯 Wybrany sklep</h6>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-8">
                                        <h5>{selectedStore.name}</h5>
                                        <p className="text-muted">{selectedStore.address || 'Brak adresu'}</p>

                                        <div className="row">
                                            {selectedStore.distanceFromUser && (
                                                <div className="col-6">
                                                    <span className="badge bg-success fs-6">
                                                        📏 {selectedStore.formattedDistance ||
                                                        (selectedStore.getFormattedDistance ?
                                                            selectedStore.getFormattedDistance() :
                                                            selectedStore.distanceFromUser.toFixed(1) + ' km')}
                                                    </span>
                                                    <p className="small text-muted mt-1">odległość od centrum</p>
                                                </div>
                                            )}

                                            {selectedStore.rating && (
                                                <div className="col-6">
                                                    <span className="badge bg-warning text-dark fs-6">
                                                        ⭐ {selectedStore.rating}/5
                                                    </span>
                                                    <p className="small text-muted mt-1">
                                                        {selectedStore.userRatingsCount ? `(${selectedStore.userRatingsCount} opinii)` : ''}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {searchMode === 'osm' && (
                                            <div className="mt-2">
                                                <span className="badge bg-info">🌍 OpenStreetMap</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-md-4">
                                        <div className="d-grid gap-2">
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => onStoreSelect && onStoreSelect(selectedStore)}
                                            >
                                                🛒 Wybierz do listy
                                            </button>
                                            {selectedStore.phoneNumber && (
                                                <a
                                                    href={`tel:${selectedStore.phoneNumber}`}
                                                    className="btn btn-outline-success"
                                                >
                                                    📞 Zadzwoń
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .store-marker, .center-marker, .osm-store-marker {
                    background: none !important;
                    border: none !important;
                }
                .leaflet-popup-content {
                    margin: 13px 19px;
                }
                .leaflet-popup-content button {
                    width: 100%;
                }
                .leaflet-control-locate:hover {
                    background: #f8f9fa !important;
                }
                #store-map-advanced {
                    min-height: 600px;
                }
                .list-group-item:hover {
                    background-color: #f8f9fa;
                }
                .list-group-item.active {
                    background-color: #007bff;
                    border-color: #007bff;
                }
            `}</style>
        </div>
    );
};

// Make it globally available
window.StoreMapAdvanced = StoreMapAdvanced;