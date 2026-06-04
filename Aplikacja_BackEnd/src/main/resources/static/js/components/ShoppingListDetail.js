// ShoppingListDetail Component - połączony z backendem
const ShoppingListDetail = ({ userId, list, onBack, onUpdate }) => {
    const [items, setItems] = React.useState(list?.items || []);
    const [showAddForm, setShowAddForm] = React.useState(false);
    const [newItem, setNewItem] = React.useState({
        name: '',
        category: '',
        quantity: 1,
        unit: 'szt',
        notes: ''
    });
    const [storeTotals, setStoreTotals] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);

    // Kategorie produktów po polsku
    const categories = [
        'Owoce i Warzywa',
        'Nabiał i Jaja',
        'Mięso i Ryby',
        'Pieczywo',
        'Napoje',
        'Przekąski',
        'Artykuły Gospodarstwa Domowego',
        'Inne'
    ];

    const units = ['szt', 'kg', 'g', 'l', 'ml', 'op'];
    const stores = ['Biedronka', 'Lidl', 'Carrefour', 'Auchan'];

    React.useEffect(() => {
        if (list) {
            const listItems = list.items || [];
            setItems(listItems);
            calculateStoreTotals(listItems);
        }
    }, [list]);

    const calculateStoreTotals = (itemsList) => {
        if (!itemsList || itemsList.length === 0) {
            setStoreTotals(null);
            return;
        }

        const totals = {};
        stores.forEach(store => {
            let total = 0;
            itemsList.forEach(item => {
                const price = item.priceComparison?.storePrices?.[store] || 0;
                total += price * item.quantity;
            });
            totals[store] = total;
        });

        // Znajdź najlepszy sklep
        let bestStore = null;
        let bestPrice = Infinity;

        Object.entries(totals).forEach(([store, total]) => {
            if (total > 0 && total < bestPrice) {
                bestPrice = total;
                bestStore = store;
            }
        });

        setStoreTotals({ totals, bestStore, bestPrice });
    };

    if (!list) {
        return (
            <div className="alert alert-warning">
                Nie wybrano listy. Wybierz listę z panelu.
                <button className="btn btn-sm btn-primary ms-3" onClick={onBack}>
                    Wróć
                </button>
            </div>
        );
    }

    const displayItems = items || [];

    const handleAddItem = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`/api/shopping/lists/${list.id || list._id}/items?userId=${encodeURIComponent(userId)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newItem)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const updatedList = await response.json();
            const updatedItems = updatedList.items || [];
            setItems(updatedItems);

            setNewItem({ name: '', category: '', quantity: 1, unit: 'szt', notes: '' });
            setShowAddForm(false);

            if (onUpdate) onUpdate(updatedList);
        } catch (error) {
            console.error('Błąd dodawania produktu:', error);
            alert('Nie udało się dodać produktu. Sprawdź konsolę dla szczegółów.');

            // Tymczasowe rozwiązanie - dodaj lokalnie
            const newItemObj = {
                id: Date.now().toString(),
                name: newItem.name,
                category: newItem.category,
                quantity: newItem.quantity,
                unit: newItem.unit,
                notes: newItem.notes,
                priceComparison: {
                    storePrices: {
                        'Biedronka': 0,
                        'Lidl': 0,
                        'Carrefour': 0,
                        'Auchan': 0
                    },
                    cheapestStore: null,
                    cheapestPrice: 0
                }
            };

            const updatedItems = [...displayItems, newItemObj];
            setItems(updatedItems);

            const updatedList = {
                ...list,
                items: updatedItems
            };

            setNewItem({ name: '', category: '', quantity: 1, unit: 'szt', notes: '' });
            setShowAddForm(false);

            if (onUpdate) onUpdate(updatedList);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePrice = async (itemId, store, price) => {
        try {
            // Jeśli itemId jest liczbą (indeks), wyślij go jako string
            // Jeśli itemId jest stringiem (ID), użyj go
            const itemIdToSend = itemId;

            const response = await fetch(`/api/shopping/lists/${list.id || list._id}/items/${itemIdToSend}/price?userId=${encodeURIComponent(userId)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ store, price: parseFloat(price) || 0 })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const updatedList = await response.json();
            const updatedItems = updatedList.items || [];
            setItems(updatedItems);

            if (onUpdate) onUpdate(updatedList);
        } catch (error) {
            console.error('Błąd aktualizacji ceny:', error);

            // Tymczasowe rozwiązanie - aktualizuj lokalnie
            const updatedItems = displayItems.map(item => {
                if (item.id === itemId || item._id === itemId) {
                    const updatedPrices = {
                        ...item.priceComparison.storePrices,
                        [store]: parseFloat(price) || 0
                    };

                    let cheapestStore = null;
                    let cheapestPrice = Infinity;

                    Object.entries(updatedPrices).forEach(([storeName, storePrice]) => {
                        if (storePrice > 0 && storePrice < cheapestPrice) {
                            cheapestPrice = storePrice;
                            cheapestStore = storeName;
                        }
                    });

                    return {
                        ...item,
                        priceComparison: {
                            storePrices: updatedPrices,
                            cheapestStore,
                            cheapestPrice: cheapestPrice === Infinity ? 0 : cheapestPrice
                        }
                    };
                }
                return item;
            });

            setItems(updatedItems);

            const updatedList = {
                ...list,
                items: updatedItems
            };

            if (onUpdate) onUpdate(updatedList);
        }
    };

    const handleRemoveItem = async (itemId) => {
        if (!confirm('Czy na pewno chcesz usunąć ten produkt z listy?')) return;

        try {
            const response = await fetch(`/api/shopping/lists/${list.id || list._id}/items/${itemId}?userId=${encodeURIComponent(userId)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const updatedList = await response.json();
            const updatedItems = updatedList.items || [];
            setItems(updatedItems);

            if (onUpdate) onUpdate(updatedList);
        } catch (error) {
            console.error('Błąd usuwania produktu:', error);

            // Tymczasowe rozwiązanie - usuń lokalnie
            const updatedItems = displayItems.filter(item => item.id !== itemId);
            setItems(updatedItems);

            const updatedList = {
                ...list,
                items: updatedItems
            };

            if (onUpdate) onUpdate(updatedList);
        }
    };

    const handleQuantityChange = async (itemId, newQuantity) => {
        // W prawdziwej aplikacji to byłby PUT request do backendu
        // Na razie tylko lokalna aktualizacja
        const updatedItems = displayItems.map(item =>
            item.id === itemId ? { ...item, quantity: Math.max(1, newQuantity) } : item
        );
        setItems(updatedItems);

        const updatedList = {
            ...list,
            items: updatedItems
        };

        if (onUpdate) onUpdate(updatedList);
    };

    React.useEffect(() => {
        calculateStoreTotals(displayItems);
    }, [displayItems]);

    return (
        <div className="shopping-list-detail">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <button
                        className="btn btn-outline-secondary me-3"
                        onClick={onBack}
                    >
                        ← Wróć do List
                    </button>
                    <h2 className="d-inline">{list.name || 'Lista Zakupów'}</h2>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddForm(!showAddForm)}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Ładowanie...
                        </>
                    ) : showAddForm ? 'Anuluj' : '+ Dodaj Produkt'}
                </button>
            </div>

            {list.description && (
                <p className="text-muted mb-4">{list.description}</p>
            )}

            {/* Formularz dodawania produktu */}
            {showAddForm && (
                <div className="card mb-4">
                    <div className="card-header">
                        <h5 className="mb-0">Dodaj Nowy Produkt</h5>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleAddItem}>
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">Nazwa produktu *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newItem.name}
                                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                                        placeholder="np. Mleko, Jabłka, Chleb"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="col-md-3 mb-3">
                                    <label className="form-label">Kategoria</label>
                                    <select
                                        className="form-select"
                                        value={newItem.category}
                                        onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                                        disabled={isLoading}
                                    >
                                        <option value="">Wybierz kategorię</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-2 mb-3">
                                    <label className="form-label">Ilość</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                                        min="1"
                                        step="1"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="col-md-2 mb-3">
                                    <label className="form-label">Jednostka</label>
                                    <select
                                        className="form-select"
                                        value={newItem.unit}
                                        onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                                        disabled={isLoading}
                                    >
                                        {units.map(unit => (
                                            <option key={unit} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-12 mb-3">
                                    <label className="form-label">Uwagi (opcjonalnie)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newItem.notes}
                                        onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                                        placeholder="np. Bio, Niskotłuszczowe, itp."
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-success" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        Dodawanie...
                                    </>
                                ) : 'Dodaj do Listy'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Podsumowanie sklepów */}
            {storeTotals && storeTotals.bestStore && (
                <div className="card mb-4">
                    <div className="card-header bg-light">
                        <h5 className="mb-0">Porównanie Cen</h5>
                    </div>
                    <div className="card-body">
                        <div className="row">
                            {stores.map(store => (
                                <div key={store} className="col-md-3 col-6 mb-2">
                                    <div className={`card ${storeTotals.bestStore === store ? 'border-success' : ''}`}>
                                        <div className="card-body text-center p-2">
                                            <h6 className="mb-1">{store}</h6>
                                            <div className={`h4 ${storeTotals.bestStore === store ? 'text-success' : 'text-dark'}`}>
                                                {(storeTotals.totals[store] || 0).toFixed(2)} zł
                                            </div>
                                            {storeTotals.bestStore === store && (
                                                <small className="text-success">★ Najlepsza cena</small>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {storeTotals.bestStore && (
                            <div className="alert alert-success mt-3">
                                <strong>Najlepsza oferta:</strong> Zakupy w <strong>{storeTotals.bestStore}</strong>
                                 będą kosztować około <strong>{(storeTotals.bestPrice || 0).toFixed(2)} zł</strong>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Lista produktów */}
            <div className="card">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Produkty na Liście ({displayItems.length})</h5>
                    {displayItems.length > 0 && (
                        <small className="text-muted">Kliknij na cenę, aby edytować</small>
                    )}
                </div>
                <div className="card-body p-0">
                    {displayItems.length === 0 ? (
                        <div className="text-center py-5">
                            <p className="text-muted">Brak produktów na tej liście.</p>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowAddForm(true)}
                                disabled={isLoading}
                            >
                                Dodaj Pierwszy Produkt
                            </button>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead>
                                <tr>
                                    <th>Produkt</th>
                                    <th>Kategoria</th>
                                    <th>Ilość</th>
                                    <th>Biedronka</th>
                                    <th>Lidl</th>
                                    <th>Carrefour</th>
                                    <th>Auchan</th>
                                    <th>Razem</th>
                                    <th>Akcje</th>
                                </tr>
                                </thead>
                                <tbody>
                                {displayItems.map(item => {
                                    const prices = item.priceComparison?.storePrices || {};
                                    const cheapestStore = item.priceComparison?.cheapestStore;
                                    const cheapestPrice = item.priceComparison?.cheapestPrice || 0;

                                    return (
                                        <tr key={item.id || item._id}>
                                            <td>
                                                <strong>{item.name}</strong>
                                                {item.notes && (
                                                    <div className="text-muted small">{item.notes}</div>
                                                )}
                                            </td>
                                            <td>
                                                <span className="badge bg-info">{item.category || 'Inne'}</span>
                                            </td>
                                            <td>
                                                <div className="input-group input-group-sm" style={{width: '120px'}}>
                                                    <button
                                                        className="btn btn-outline-secondary"
                                                        type="button"
                                                        onClick={() => handleQuantityChange(item.id || item._id, Math.max(1, item.quantity - 1))}
                                                        disabled={isLoading}
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        className="form-control text-center"
                                                        value={item.quantity}
                                                        onChange={(e) => handleQuantityChange(item.id || item._id, parseInt(e.target.value) || 1)}
                                                        min="1"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="input-group-text">{item.unit}</span>
                                                    <button
                                                        className="btn btn-outline-secondary"
                                                        type="button"
                                                        onClick={() => handleQuantityChange(item.id || item._id, item.quantity + 1)}
                                                        disabled={isLoading}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            {/* Ceny w sklepach */}
                                            {stores.map(store => {
                                                const price = prices[store] || 0;
                                                const totalForStore = price * item.quantity;
                                                const isCheapest = cheapestStore === store && cheapestPrice > 0;

                                                return (
                                                    <td key={store}>
                                                        <div
                                                            className={`price-cell ${isCheapest ? 'text-success fw-bold' : ''}`}
                                                            style={{cursor: 'pointer'}}
                                                            onClick={() => {
                                                                if (isLoading) return;
                                                                const newPrice = prompt(`Podaj cenę dla ${item.name} w ${store} (za ${item.unit}):`, price);
                                                                if (newPrice !== null) {
                                                                    const numPrice = parseFloat(newPrice);
                                                                    if (!isNaN(numPrice)) {
                                                                        handleUpdatePrice(item.id || item._id, store, numPrice);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {price.toFixed(2)} zł
                                                            <div className="small text-muted">
                                                                {totalForStore.toFixed(2)} zł
                                                            </div>
                                                            {isCheapest && <div className="small text-success">★ Najtaniej</div>}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td>
                                                <strong className="text-primary">
                                                    {(cheapestPrice * item.quantity).toFixed(2)} zł
                                                </strong>
                                                <div className="small text-muted">
                                                    w {cheapestStore || 'brak'}
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleRemoveItem(item.id || item._id)}
                                                    disabled={isLoading}
                                                >
                                                    Usuń
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {displayItems.length > 0 && (
                    <div className="card-footer">
                        <div className="row">
                            <div className="col-md-6">
                                <strong>Łącznie produktów:</strong> {displayItems.length}
                            </div>
                            <div className="col-md-6 text-end">
                                {storeTotals && storeTotals.bestStore && (
                                    <div>
                                        <strong>Szacowany koszt:</strong>{' '}
                                        <span className="text-success h5">
                                            {(storeTotals.bestPrice || 0).toFixed(2)} zł
                                        </span>
                                        <div className="small text-muted">
                                            w {storeTotals.bestStore}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Make it globally available
window.ShoppingListDetail = ShoppingListDetail;