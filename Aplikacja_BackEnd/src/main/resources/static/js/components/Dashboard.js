const Dashboard = ({ userInfo, onLogout }) => {
    const [selectedList, setSelectedList] = React.useState(null);
    const [userLists, setUserLists] = React.useState([]);
    const [activeTab, setActiveTab] = React.useState('shopping');
    const [stores, setStores] = React.useState([]);
    const [profileLoading, setProfileLoading] = React.useState(true);

    console.log('Dashboard render - userInfo:', userInfo);

    // Pobierz listy zakupów
    React.useEffect(() => {
        if (userInfo && userInfo.email) {
            fetchUserLists();
        }
    }, [userInfo]);

    // Pobierz sklepy
    React.useEffect(() => {
        fetchStores();
    }, []);

    const fetchUserLists = async () => {
        console.log('Pobieranie list dla:', userInfo.email);
        try {
            const response = await fetch(`/api/shopping/lists?userId=${encodeURIComponent(userInfo.email)}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Otrzymane listy:', data);
            setUserLists(data);
        } catch (error) {
            console.error('Błąd pobierania list:', error);
            // Fallback - spróbuj z localStorage
            const savedLists = localStorage.getItem(`shoppingLists_${userInfo.email}`);
            if (savedLists) {
                setUserLists(JSON.parse(savedLists));
            }
        }
    };

    const fetchStores = async () => {
        try {
            const response = await fetch('/api/maps/store-locations');
            if (response.ok) {
                const data = await response.json();
                setStores(data.stores || []);
            } else {
                console.log('Brak sklepów w backendzie, używam przykładowych');
                // Przykładowe sklepy
                setStores([
                    {
                        id: '1',
                        name: 'Biedronka',
                        address: 'ul. Przykładowa 1, Warszawa',
                        latitude: 52.2297,
                        longitude: 21.0122,
                        rating: 4.2
                    },
                    {
                        id: '2',
                        name: 'Lidl',
                        address: 'ul. Testowa 15, Warszawa',
                        latitude: 52.2300,
                        longitude: 21.0150,
                        rating: 4.5
                    }
                ]);
            }
        } catch (error) {
            console.error('Błąd pobierania sklepów:', error);
            // Użyj przykładowych sklepów
            setStores([
                {
                    id: '1',
                    name: 'Biedronka',
                    address: 'ul. Przykładowa 1, Warszawa',
                    latitude: 52.2297,
                    longitude: 21.0122,
                    rating: 4.2
                }
            ]);
        }
    };

    const handleListSelect = (list) => {
        setSelectedList(list);
    };

    const handleListUpdate = (updatedList) => {
        setSelectedList(updatedList);
        const updatedLists = userLists.map(l =>
            l.id === updatedList.id ? updatedList : l
        );
        setUserLists(updatedLists);
        localStorage.setItem(`shoppingLists_${userInfo.email}`, JSON.stringify(updatedLists));
    };

    const handleBackToList = () => {
        setSelectedList(null);
    };

    // Ekran profilu
    if (activeTab === 'profile') {
        return (
            <div className="container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2>👤 Mój Profil</h2>
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => setActiveTab('shopping')}
                    >
                        ← Wróć do Zakupów
                    </button>
                </div>

                <div className="row">
                    <div className="col-md-8">
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-primary text-white">
                                <h5 className="mb-0">Informacje o Koncie</h5>
                            </div>
                            <div className="card-body">
                                {!userInfo ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Ładowanie...</span>
                                        </div>
                                        <p className="mt-2">Ładowanie danych profilu...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">Nazwa użytkownika</label>
                                            <div className="form-control bg-light">
                                                {userInfo.username || 'Nie ustawiono'}
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">Email</label>
                                            <div className="form-control bg-light">
                                                {userInfo.email || 'Nie ustawiono'}
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">Data rejestracji</label>
                                            <div className="form-control bg-light">
                                                {new Date().toLocaleDateString('pl-PL')}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="card shadow-sm mb-4">
                            <div className="card-header bg-success text-white">
                                <h5 className="mb-0">Statystyki</h5>
                            </div>
                            <div className="card-body">
                                <div className="text-center mb-4">
                                    <div className="display-6 text-primary fw-bold">
                                        {userLists.length}
                                    </div>
                                    <p className="text-muted mb-0">Łącznie list zakupów</p>
                                </div>

                                <div className="text-center mb-4">
                                    <div className="display-6 text-success fw-bold">
                                        {userLists.reduce((total, list) => total + (list.items?.length || 0), 0)}
                                    </div>
                                    <p className="text-muted mb-0">Łącznie produktów</p>
                                </div>

                                <hr />

                                <button
                                    className="btn btn-danger w-100 mt-2"
                                    onClick={onLogout}
                                >
                                    🚪 Wyloguj się
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // W Dashboard.js zmień zakładkę mapy na:
    if (activeTab === 'stores-map') {
        return (
            <div className="container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2>🗺️ Zaawansowana mapa sklepów</h2>
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => setActiveTab('shopping')}
                    >
                        ← Wróć do Zakupów
                    </button>
                </div>

                <StoreMapAdvanced
                    stores={stores}
                    onStoreSelect={(store) => {
                        console.log('Wybrano sklep:', store);
                        // Tutaj możesz dodać logikę, np. dodanie do listy
                    }}
                />
            </div>
        );
    }

    // Główny ekran z listami zakupów
    return (
        <div className="container mt-4">
            {/* Nawigacja */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Panel Zakupów</h2>
                <div className="btn-group" role="group">
                    <button
                        className={`btn ${activeTab === 'shopping' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setActiveTab('shopping')}
                    >
                        🛒 Listy Zakupów
                    </button>
                    <button
                        className={`btn ${activeTab === 'stores-map' ? 'btn-primary' : 'btn-outline-primary'} ms-2`}
                        onClick={() => setActiveTab('stores-map')}
                    >
                        🗺️ Mapa Sklepów
                    </button>
                    <button
                        className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline-primary'} ms-2`}
                        onClick={() => setActiveTab('profile')}
                    >
                        👤 Mój Profil
                    </button>
                </div>
            </div>

            {/* Komunikat powitalny */}
            <div className="alert alert-info mb-4">
                <h5>Witaj {userInfo?.username || 'Użytkowniku'}! 👋</h5>
                <p className="mb-0">
                    Zarządzaj swoimi listami zakupów, porównuj ceny w różnych sklepach i znajdź najlepsze okazje.
                    {userLists.length === 0 && ' Zacznij od utworzenia swojej pierwszej listy zakupów poniżej.'}
                </p>
            </div>

            {/* Jeśli wybrano listę, pokaż szczegóły */}
            {selectedList ? (
                <ShoppingListDetail
                    userId={userInfo?.email}
                    list={selectedList}
                    onBack={handleBackToList}
                    onUpdate={handleListUpdate}
                />
            ) : (
                <ShoppingLists
                    userId={userInfo?.email}
                    onSelectList={handleListSelect}
                />
            )}
        </div>
    );
};

// Make it globally available
window.Dashboard = Dashboard;