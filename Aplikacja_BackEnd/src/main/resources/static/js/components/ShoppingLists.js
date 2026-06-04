// ShoppingLists Component - połączony z backendem
const ShoppingLists = ({ userId, onSelectList }) => {
    const [lists, setLists] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [showCreateForm, setShowCreateForm] = React.useState(false);
    const [newListName, setNewListName] = React.useState('');
    const [newListDesc, setNewListDesc] = React.useState('');

    // Pobierz listy z backendu
    React.useEffect(() => {
        fetchUserLists();
    }, [userId]);

    const fetchUserLists = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            console.log('Pobieranie list dla użytkownika:', userId);
            const response = await fetch(`/api/shopping/lists?userId=${encodeURIComponent(userId)}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Otrzymane listy:', data);
            setLists(data);
        } catch (error) {
            console.error('Błąd pobierania list:', error);
            // Tymczasowo użyj localStorage jako fallback
            const savedLists = localStorage.getItem(`shoppingLists_${userId}`);
            if (savedLists) {
                setLists(JSON.parse(savedLists));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`/api/shopping/lists?userId=${encodeURIComponent(userId)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newListName,
                    description: newListDesc
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const newList = await response.json();
            console.log('Utworzono nową listę:', newList);
            setLists([...lists, newList]);
            setNewListName('');
            setNewListDesc('');
            setShowCreateForm(false);

            // Automatycznie otwórz nową listę
            if (onSelectList) {
                onSelectList(newList);
            }
        } catch (error) {
            console.error('Błąd tworzenia listy:', error);
            alert('Nie udało się utworzyć listy. Sprawdź konsolę dla szczegółów.');

            // Tymczasowe rozwiązanie - zapisz lokalnie
            const newList = {
                id: Date.now().toString(),
                userId: userId,
                name: newListName,
                description: newListDesc,
                createdAt: new Date().toISOString(),
                items: []
            };

            const updatedLists = [...lists, newList];
            setLists(updatedLists);
            localStorage.setItem(`shoppingLists_${userId}`, JSON.stringify(updatedLists));
            setNewListName('');
            setNewListDesc('');
            setShowCreateForm(false);

            if (onSelectList) {
                onSelectList(newList);
            }
        }
    };

    const handleDeleteList = async (listId, e) => {
        e.stopPropagation();

        if (!confirm('Czy na pewno chcesz usunąć tę listę?')) return;

        try {
            const response = await fetch(`/api/shopping/lists/${listId}?userId=${encodeURIComponent(userId)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setLists(lists.filter(list => list.id !== listId));
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Błąd usuwania listy:', error);

            // Tymczasowe rozwiązanie - usuń lokalnie
            const updatedLists = lists.filter(list => list.id !== listId);
            setLists(updatedLists);
            localStorage.setItem(`shoppingLists_${userId}`, JSON.stringify(updatedLists));
        }
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Ładowanie...</span>
                </div>
                <p className="mt-2">Ładowanie list zakupów...</p>
            </div>
        );
    }

    return (
        <div className="shopping-lists-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Moje Listy Zakupów</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                >
                    {showCreateForm ? 'Anuluj' : '+ Nowa Lista'}
                </button>
            </div>

            {showCreateForm && (
                <div className="card mb-4">
                    <div className="card-header">
                        <h5 className="mb-0">Utwórz Nową Listę Zakupów</h5>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleCreateList}>
                            <div className="mb-3">
                                <label className="form-label">Nazwa listy *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    placeholder="np. Zakupy tygodniowe"
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Opis (opcjonalnie)</label>
                                <textarea
                                    className="form-control"
                                    value={newListDesc}
                                    onChange={(e) => setNewListDesc(e.target.value)}
                                    placeholder="np. Produkty na cały tydzień"
                                    rows="2"
                                />
                            </div>
                            <button type="submit" className="btn btn-success">
                                Utwórz Listę
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {lists.length === 0 ? (
                <div className="alert alert-info">
                    <h5>Brak list zakupów</h5>
                    <p>Utwórz swoją pierwszą listę zakupów, aby zacząć porównywać ceny!</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateForm(true)}
                    >
                        Utwórz Pierwszą Listę
                    </button>
                </div>
            ) : (
                <div className="row">
                    {lists.map(list => (
                        <div key={list.id || list._id} className="col-md-6 col-lg-4 mb-4">
                            <div
                                className="card h-100 shadow-sm hover-shadow"
                                style={{ cursor: 'pointer' }}
                                onClick={() => onSelectList && onSelectList(list)}
                            >
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <h5 className="card-title">{list.name}</h5>
                                        <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={(e) => handleDeleteList(list.id || list._id, e)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <p className="card-text text-muted small">
                                        {list.description || 'Brak opisu'}
                                    </p>
                                    <div className="mt-3">
                                        <span className="badge bg-secondary">
                                            {list.items ? list.items.length : 0} produktów
                                        </span>
                                        <span className="badge bg-light text-dark ms-2">
                                            {new Date(list.createdAt).toLocaleDateString('pl-PL')}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-footer bg-transparent">
                                    <small className="text-muted">
                                        Kliknij, aby wyświetlić i edytować
                                    </small>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Make it globally available
window.ShoppingLists = ShoppingLists;