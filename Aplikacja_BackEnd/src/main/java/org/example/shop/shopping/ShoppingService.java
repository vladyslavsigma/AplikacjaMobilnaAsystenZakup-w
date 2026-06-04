package org.example.shop.shopping;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ShoppingService {

    private final ShoppingListRepository shoppingListRepository;
    private final StoreRepository storeRepository;
    private final PriceService priceService;

    public ShoppingService(ShoppingListRepository shoppingListRepository,
                           StoreRepository storeRepository,
                           PriceService priceService) {
        this.shoppingListRepository = shoppingListRepository;
        this.storeRepository = storeRepository;
        this.priceService = priceService;
    }

    // ========== LISTY ZAKUPÓW ==========

    /**
     * Pobierz wszystkie listy użytkownika
     */
    public List<ShoppingList> getUserLists(String userId) {
        List<ShoppingList> lists = shoppingListRepository.findByUserId(userId);

        // Dla każdej listy oblicz statystyki
        lists.forEach(this::enrichListWithStats);

        return lists;
    }

    /**
     * Aktualizuj produkt na liście
     */
    public ShoppingList updateItem(String userId, String listId, String itemId, ShoppingItem updatedItem) {
        System.out.println("=== UPDATE ITEM ===");
        System.out.println("userId: " + userId);
        System.out.println("listId: " + listId);
        System.out.println("itemId: " + itemId);
        System.out.println("Updated item data: " + updatedItem.toString());

        Optional<ShoppingList> listOpt = shoppingListRepository.findById(listId);

        if (listOpt.isPresent()) {
            ShoppingList list = listOpt.get();
            System.out.println("List found. Owner: " + list.getUserId());

            // Sprawdź czy lista należy do użytkownika
            if (!list.getUserId().equals(userId)) {
                System.out.println("List does not belong to user!");
                return null;
            }

            // Znajdź produkt
            boolean updated = false;
            for (ShoppingItem item : list.getItems()) {
                System.out.println("Checking item: " + item.getId() + " vs " + itemId);
                if (item.getId().equals(itemId) || (item.getId() != null && item.getId().equals(itemId))) {
                    System.out.println("Item found! Old quantity: " + item.getQuantity() + ", new: " + updatedItem.getQuantity());

                    // Aktualizuj dane produktu
                    if (updatedItem.getName() != null) {
                        item.setName(updatedItem.getName());
                    }
                    if (updatedItem.getCategory() != null) {
                        item.setCategory(updatedItem.getCategory());
                    }
                    if (updatedItem.getQuantity() > 0) {
                        item.setQuantity(updatedItem.getQuantity());
                    }
                    if (updatedItem.getUnit() != null) {
                        item.setUnit(updatedItem.getUnit());
                    }
                    if (updatedItem.getNotes() != null) {
                        item.setNotes(updatedItem.getNotes());
                    }

                    updated = true;
                    break;
                }
            }

            if (updated) {
                System.out.println("Item updated successfully!");
                ShoppingList savedList = shoppingListRepository.save(list);

                // Jeśli zmieniono ilość, przelicz najlepszy sklep
                if (updatedItem.getQuantity() > 0) {
                    calculateAndUpdateBestStore(savedList);
                }

                return savedList;
            } else {
                System.out.println("Item not found in list!");
            }
        } else {
            System.out.println("List not found!");
        }

        return null;
    }

    /**
     * Aktualizuj tylko ilość produktu
     */
    public ShoppingList updateItemQuantity(String userId, String listId, String itemId, int newQuantity) {
        System.out.println("=== UPDATE ITEM QUANTITY ===");
        System.out.println("userId: " + userId);
        System.out.println("listId: " + listId);
        System.out.println("itemId: " + itemId);
        System.out.println("newQuantity: " + newQuantity);

        Optional<ShoppingList> listOpt = shoppingListRepository.findById(listId);

        if (listOpt.isPresent()) {
            ShoppingList list = listOpt.get();

            // Sprawdź czy lista należy do użytkownika
            if (!list.getUserId().equals(userId)) {
                return null;
            }

            // Znajdź i zaktualizuj produkt
            boolean updated = false;
            for (ShoppingItem item : list.getItems()) {
                if (item.getId().equals(itemId)) {
                    System.out.println("Found item: " + item.getName() + ", old quantity: " + item.getQuantity());
                    item.setQuantity(newQuantity);
                    updated = true;
                    break;
                }
            }

            if (updated) {
                ShoppingList savedList = shoppingListRepository.save(list);

                // Przeprowadź obliczenia cen
                calculateAndUpdateBestStore(savedList);

                return savedList;
            }
        }

        return null;
    }

    /**
     * Oblicz i zaktualizuj najlepszy sklep dla listy
     */
    private void calculateAndUpdateBestStore(ShoppingList list) {
        if (list == null || list.getItems() == null || list.getItems().isEmpty()) {
            return;
        }

        System.out.println("=== CALCULATING BEST STORE ===");
        System.out.println("List items: " + list.getItems().size());

        StoreSummary summary = priceService.calculateBestStoreForShoppingList(list);
        System.out.println("Best store calculated: " + summary.getBestStore() + ", price: " + summary.getBestPrice());

        if (summary.getBestStore() != null && summary.getBestPrice() > 0) {
            // Zaktualizuj cenę dla każdego produktu
            for (ShoppingItem item : list.getItems()) {
                if (item.getPriceComparison() == null) {
                    item.setPriceComparison(new PriceComparison());
                }

                Map<String, Double> storePrices = item.getPriceComparison().getStorePrices();
                if (storePrices == null || storePrices.isEmpty()) {
                    // Pobierz ceny jeśli brakuje
                    Map<String, Double> prices = priceService.getPricesForProduct(item.getName());
                    item.getPriceComparison().setStorePrices(prices);
                    storePrices = prices;
                }

                // Ustaw najlepszy sklep dla tego produktu
                Double price = storePrices.get(summary.getBestStore());
                if (price != null && price > 0) {
                    item.getPriceComparison().setCheapestStore(summary.getBestStore());
                    item.getPriceComparison().setCheapestPrice(price * item.getQuantity());
                    System.out.println("Item " + item.getName() + ": cheapest store=" + summary.getBestStore() +
                            ", price=" + (price * item.getQuantity()));
                }
            }

            shoppingListRepository.save(list);
            System.out.println("Best store updated in database");
        }
    }

    /**
     * Utwórz nową listę zakupów
     */
    public ShoppingList createList(String userId, ShoppingListRequest request) {
        ShoppingList list = new ShoppingList(userId, request.getName(), request.getDescription());
        return shoppingListRepository.save(list);
    }

    /**
     * Pobierz konkretną listę
     */
    public Optional<ShoppingList> getList(String userId, String listId) {
        Optional<ShoppingList> listOpt = shoppingListRepository.findById(listId)
                .filter(list -> list.getUserId().equals(userId));

        // Wzbogać listę o statystyki i prawdziwe ceny
        listOpt.ifPresent(this::enrichListWithStats);

        return listOpt;
    }

    /**
     * Usuń listę
     */
    public void deleteList(String userId, String listId) {
        shoppingListRepository.deleteByUserIdAndId(userId, listId);
    }

    // ========== ELEMENTY LISTY ==========

    /**
     * Dodaj produkt do listy z PRAWDZIWYMI CENAMI
     */
    public ShoppingList addItemToList(String userId, String listId, ShoppingItemRequest request) {
        Optional<ShoppingList> optionalList = getList(userId, listId);
        if (optionalList.isEmpty()) {
            return null;
        }

        ShoppingList list = optionalList.get();
        ShoppingItem item = createShoppingItemWithRealPrices(request);

        list.addItem(item);
        System.out.println("Dodano produkt: " + item.getName() + " z ID: " + item.getId());

        ShoppingList savedList = shoppingListRepository.save(list);

        // Przelicz statystyki po dodaniu
        enrichListWithStats(savedList);

        return savedList;
    }

    /**
     * Utwórz ShoppingItem z rzeczywistymi cenami z bazy
     */
    private ShoppingItem createShoppingItemWithRealPrices(ShoppingItemRequest request) {
        ShoppingItem item = new ShoppingItem(
                request.getName(),
                request.getQuantity(),
                request.getUnit()
        );
        item.setCategory(request.getCategory());
        item.setNotes(request.getNotes());

        // Pobierz PRAWDZIWE ceny z bazy danych
        Map<String, Double> realPrices = priceService.getPricesForProduct(request.getName());

        System.out.println("Pobrano ceny dla produktu '" + request.getName() + "': " + realPrices);

        // Ustaw ceny w produkcie
        PriceComparison priceComparison = new PriceComparison();
        priceComparison.setStorePrices(realPrices);
        item.setPriceComparison(priceComparison);

        return item;
    }

    /**
     * Aktualizuj cenę produktu w konkretnym sklepie
     */
    public ShoppingList updateItemPrice(String userId, String listId, String itemId,
                                        String store, double price) {
        Optional<ShoppingList> optionalList = getList(userId, listId);
        if (optionalList.isEmpty()) {
            return null;
        }

        ShoppingList list = optionalList.get();
        boolean found = false;

        // Szukaj produktu po ID
        for (ShoppingItem item : list.getItems()) {
            if (item.getId() != null && item.getId().equals(itemId)) {
                item.getPriceComparison().addStorePrice(store, price);
                found = true;
                System.out.println("Zaktualizowano cenę produktu " + item.getName() +
                        " w sklepie " + store + " na " + price + " zł");
                break;
            }
        }

        // Jeśli nie znaleziono po ID, spróbuj po indeksie (dla kompatybilności)
        if (!found) {
            try {
                int index = Integer.parseInt(itemId);
                if (index >= 0 && index < list.getItems().size()) {
                    ShoppingItem item = list.getItems().get(index);
                    item.getPriceComparison().addStorePrice(store, price);
                    System.out.println("Zaktualizowano cenę produktu " + item.getName() +
                            " (indeks " + index + ") w sklepie " + store);
                }
            } catch (NumberFormatException e) {
                System.out.println("Nie znaleziono produktu o ID: " + itemId);
                return null;
            }
        }

        ShoppingList savedList = shoppingListRepository.save(list);
        enrichListWithStats(savedList);

        return savedList;
    }

    /**
     * Usuń produkt z listy
     */
    public ShoppingList removeItem(String userId, String listId, String itemId) {
        Optional<ShoppingList> optionalList = getList(userId, listId);
        if (optionalList.isEmpty()) {
            return null;
        }

        ShoppingList list = optionalList.get();

        // Usuń po ID
        boolean removed = list.getItems().removeIf(item ->
                item.getId() != null && item.getId().equals(itemId));

        if (!removed) {
            // Jeśli nie udało się po ID, spróbuj po indeksie
            try {
                int index = Integer.parseInt(itemId);
                if (index >= 0 && index < list.getItems().size()) {
                    list.getItems().remove(index);
                    removed = true;
                }
            } catch (NumberFormatException e) {
                // Nic nie rób
            }
        }

        if (removed) {
            System.out.println("Usunięto produkt o ID/indeksie: " + itemId + " z listy: " + list.getName());
            ShoppingList savedList = shoppingListRepository.save(list);
            enrichListWithStats(savedList);
            return savedList;
        } else {
            System.out.println("Nie znaleziono produktu do usunięcia: " + itemId);
            return null;
        }
    }

    // ========== OBLICZENIA I STATYSTYKI ==========

    /**
     * Wzbogać listę o statystyki i obliczenia
     */
    private void enrichListWithStats(ShoppingList list) {
        if (list == null || list.getItems() == null) {
            return;
        }

        int itemCount = list.getItems().size();
        System.out.println("Wzbogacanie listy '" + list.getName() + "' z " + itemCount + " produktami");

        // Oblicz statystyki dla każdego produktu
        list.getItems().forEach(this::enrichItemWithCalculations);

        // Oblicz najlepszy sklep dla całej listy
        StoreSummary bestStore = calculateBestStore(list);
        if (bestStore != null) {
            System.out.println("Najlepszy sklep dla listy '" + list.getName() + "': " +
                    bestStore.getBestStore() + " za " + bestStore.getBestPrice() + " zł");
        }
    }

    /**
     * Wzbogać produkt o obliczone dane (najtańszy sklep itp.)
     */
    private void enrichItemWithCalculations(ShoppingItem item) {
        if (item.getPriceComparison() == null ||
                item.getPriceComparison().getStorePrices() == null ||
                item.getPriceComparison().getStorePrices().isEmpty()) {
            return;
        }

        Map<String, Double> prices = item.getPriceComparison().getStorePrices();

        // Znajdź najtańszy sklep
        Optional<Map.Entry<String, Double>> cheapest = prices.entrySet().stream()
                .filter(entry -> entry.getValue() > 0)
                .min(Map.Entry.comparingByValue());

        if (cheapest.isPresent()) {
            item.getPriceComparison().setCheapestStore(cheapest.get().getKey());
            item.getPriceComparison().setCheapestPrice(cheapest.get().getValue());
        }
    }

    /**
     * Oblicz całkowity koszt listy w konkretnym sklepie
     */
    public double calculateTotalForStore(ShoppingList list, String store) {
        if (list == null || list.getItems() == null || store == null) {
            return 0.0;
        }

        double total = 0.0;
        int itemsWithPrices = 0;

        for (ShoppingItem item : list.getItems()) {
            if (item.getPriceComparison() != null &&
                    item.getPriceComparison().getStorePrices() != null) {

                Double itemPrice = item.getPriceComparison().getStorePrices().get(store);
                if (itemPrice != null && itemPrice > 0) {
                    total += itemPrice * item.getQuantity();
                    itemsWithPrices++;
                }
            }
        }

        System.out.println("Koszt listy '" + list.getName() + "' w sklepie " + store +
                ": " + total + " zł (produkty z cenami: " + itemsWithPrices + ")");

        return Math.round(total * 100.0) / 100.0; // Zaokrąglij do 2 miejsc
    }

    /**
     * Oblicz najlepszy sklep dla całej listy
     */
    public StoreSummary calculateBestStore(ShoppingList list) {
        StoreSummary summary = new StoreSummary();

        // Pobierz wszystkie aktywne sklepy z bazy
        List<Store> stores = storeRepository.findByIsActiveTrue();

        if (stores.isEmpty()) {
            System.out.println("Brak sklepów w bazie, używam domyślnych");
            stores = getDefaultStores();
        }

        // Dla każdego sklepu oblicz całkowity koszt
        for (Store store : stores) {
            double total = calculateTotalForStore(list, store.getName());

            if (total > 0) {
                summary.addStoreTotal(store.getName(), total);
                System.out.println("Sklep " + store.getName() + ": " + total + " zł");
            }
        }

        summary.calculateBest();

        if (summary.getBestStore() != null) {
            System.out.println("Najlepszy sklep: " + summary.getBestStore() +
                    " za " + summary.getBestPrice() + " zł");
        }

        return summary;
    }

    /**
     * Pobierz sklepy, w których jest najwięcej produktów z listy
     */
    public List<Store> getStoresWithMostItems(ShoppingList list, int limit) {
        Map<String, Integer> storeItemCount = new HashMap<>();

        if (list.getItems() != null) {
            for (ShoppingItem item : list.getItems()) {
                if (item.getPriceComparison() != null &&
                        item.getPriceComparison().getStorePrices() != null) {

                    for (String store : item.getPriceComparison().getStorePrices().keySet()) {
                        Double price = item.getPriceComparison().getStorePrices().get(store);
                        if (price != null && price > 0) {
                            storeItemCount.put(store, storeItemCount.getOrDefault(store, 0) + 1);
                        }
                    }
                }
            }
        }

        // Posortuj sklepy po liczbie produktów
        return storeItemCount.entrySet().stream()
                .sorted((e1, e2) -> e2.getValue().compareTo(e1.getValue()))
                .limit(limit)
                .map(entry -> {
                    Store store = new Store();
                    store.setName(entry.getKey());
                    return store;
                })
                .collect(Collectors.toList());
    }

    /**
     * Oblicz potencjalne oszczędności (różnica między najdroższym a najtańszym sklepem)
     */
    public double calculatePotentialSavings(ShoppingList list) {
        StoreSummary summary = calculateBestStore(list);

        if (summary.getStoreTotals().size() < 2) {
            return 0.0;
        }

        // Znajdź najdroższy sklep
        Optional<Double> maxPrice = summary.getStoreTotals().values().stream()
                .max(Double::compare);

        if (maxPrice.isPresent()) {
            double savings = maxPrice.get() - summary.getBestPrice();
            return Math.round(savings * 100.0) / 100.0;
        }

        return 0.0;
    }

    // ========== POMOCNICZE ==========

    /**
     * Domyślne sklepy (jeśli baza jest pusta)
     */
    private List<Store> getDefaultStores() {
        List<Store> defaultStores = new ArrayList<>();

        String[] storeNames = {"Biedronka", "Lidl", "Carrefour", "Auchan", "Żabka", "Aldi"};
        String[] addresses = {"Łódź, Polska", "Łódź, Polska", "Łódź, Polska",
                "Łódź, Polska", "Łódź, Polska", "Łódź, Polska"};

        for (int i = 0; i < storeNames.length; i++) {
            Store store = new Store();
            store.setId("default-" + i);
            store.setName(storeNames[i]);
            store.setAddress(addresses[i]);
            store.setActive(true);
            store.setRating(4.0 + (Math.random() * 0.5)); // 4.0 - 4.5

            // Losowe koordynaty w Łodzi
            store.setLatitude(51.75 + (Math.random() * 0.02 - 0.01)); // 51.74 - 51.76
            store.setLongitude(19.46 + (Math.random() * 0.04 - 0.02)); // 19.44 - 19.48

            defaultStores.add(store);
        }

        return defaultStores;
    }

    /**
     * Pobierz statystyki dla dashboardu
     */
    public DashboardStats getDashboardStats(String userId) {
        List<ShoppingList> lists = getUserLists(userId);

        DashboardStats stats = new DashboardStats();
        stats.setTotalLists(lists.size());
        stats.setTotalItems(lists.stream()
                .mapToInt(list -> list.getItems() != null ? list.getItems().size() : 0)
                .sum());
        stats.setTotalSavings(calculateTotalSavings(lists));

        // Ostatnie 3 listy
        stats.setRecentLists(lists.stream()
                .sorted((l1, l2) -> l2.getCreatedAt().compareTo(l1.getCreatedAt()))
                .limit(3)
                .map(list -> {
                    ShoppingListSummary summary = new ShoppingListSummary();
                    summary.setId(list.getId());
                    summary.setName(list.getName());
                    summary.setItemCount(list.getItems() != null ? list.getItems().size() : 0);
                    summary.setTotalEstimatedCost(calculateListTotal(list));
                    return summary;
                })
                .collect(Collectors.toList()));

        return stats;
    }

    /**
     * Oblicz całkowite oszczędności dla wszystkich list
     */
    private double calculateTotalSavings(List<ShoppingList> lists) {
        return lists.stream()
                .mapToDouble(this::calculatePotentialSavings)
                .sum();
    }

    /**
     * Oblicz całkowity koszt listy (przy założeniu zakupów w najtańszym sklepie)
     */
    private double calculateListTotal(ShoppingList list) {
        StoreSummary summary = calculateBestStore(list);
        return summary.getBestPrice();
    }

    // ========== KLASY POMOCNICZE DLA DASHBOARDU ==========

    public static class DashboardStats {
        private int totalLists;
        private int totalItems;
        private double totalSavings;
        private List<ShoppingListSummary> recentLists = new ArrayList<>();

        // Gettery i settery
        public int getTotalLists() { return totalLists; }
        public void setTotalLists(int totalLists) { this.totalLists = totalLists; }

        public int getTotalItems() { return totalItems; }
        public void setTotalItems(int totalItems) { this.totalItems = totalItems; }

        public double getTotalSavings() { return totalSavings; }
        public void setTotalSavings(double totalSavings) {
            this.totalSavings = Math.round(totalSavings * 100.0) / 100.0;
        }

        public List<ShoppingListSummary> getRecentLists() { return recentLists; }
        public void setRecentLists(List<ShoppingListSummary> recentLists) {
            this.recentLists = recentLists;
        }
    }

    public static class ShoppingListSummary {
        private String id;
        private String name;
        private int itemCount;
        private double totalEstimatedCost;

        // Gettery i settery
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public int getItemCount() { return itemCount; }
        public void setItemCount(int itemCount) { this.itemCount = itemCount; }

        public double getTotalEstimatedCost() { return totalEstimatedCost; }
        public void setTotalEstimatedCost(double totalEstimatedCost) {
            this.totalEstimatedCost = Math.round(totalEstimatedCost * 100.0) / 100.0;
        }
    }

    /**
     * Dodaj brakujące produkty do listy (sugestie)
     */
    public List<String> getProductSuggestions(String userId, String listId, int limit) {
        Optional<ShoppingList> listOpt = getList(userId, listId);
        if (listOpt.isEmpty()) {
            return Collections.emptyList();
        }

        ShoppingList list = listOpt.get();
        Set<String> existingProducts = list.getItems().stream()
                .map(ShoppingItem::getName)
                .collect(Collectors.toSet());

        // Popularne produkty (w rzeczywistości można pobrać z bazy)
        List<String> popularProducts = Arrays.asList(
                "Mleko", "Chleb", "Jajka", "Masło", "Ser żółty", "Wędlina",
                "Kurczak", "Ryż", "Makaron", "Olej", "Cukier", "Kawa",
                "Herbata", "Pomidor", "Ogórek", "Marchew", "Ziemniaki",
                "Jabłka", "Banany", "Woda mineralna", "Coca-Cola", "Sok",
                "Płatki śniadaniowe", "Jogurt", "Twarożek", "Szynka",
                "Kiełbasa", "Parówki", "Ryba", "Mąka", "Drożdże", "Cebula",
                "Czosnek", "Papryka", "Sałata", "Pieczarki", "Cytryny",
                "Pomarańcze", "Winogrona", "Truskawki", "Maliny"
        );

        return popularProducts.stream()
                .filter(product -> !existingProducts.contains(product))
                .limit(limit)
                .collect(Collectors.toList());
    }

    /**
     * Oblicz średnią cenę produktu w różnych sklepach
     */
    public Map<String, Double> getAveragePricesByCategory(String userId) {
        List<ShoppingList> lists = getUserLists(userId);

        Map<String, List<Double>> categoryPrices = new HashMap<>();
        Map<String, Integer> categoryCounts = new HashMap<>();

        // Zbierz wszystkie ceny produktów pogrupowane wg kategorii
        for (ShoppingList list : lists) {
            for (ShoppingItem item : list.getItems()) {
                String category = item.getCategory() != null ? item.getCategory() : "Inne";
                Map<String, Double> prices = item.getPriceComparison().getStorePrices();

                if (prices != null) {
                    double avgPrice = prices.values().stream()
                            .filter(price -> price > 0)
                            .mapToDouble(Double::doubleValue)
                            .average()
                            .orElse(0.0);

                    if (avgPrice > 0) {
                        categoryPrices.computeIfAbsent(category, k -> new ArrayList<>())
                                .add(avgPrice);
                        categoryCounts.put(category, categoryCounts.getOrDefault(category, 0) + 1);
                    }
                }
            }
        }

        // Oblicz średnie dla każdej kategorii
        Map<String, Double> result = new HashMap<>();
        for (Map.Entry<String, List<Double>> entry : categoryPrices.entrySet()) {
            double avg = entry.getValue().stream()
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0.0);
            result.put(entry.getKey(), Math.round(avg * 100.0) / 100.0);
        }

        return result;
    }

    /**
     * Pobierz historię cen dla konkretnego produktu
     */
    public Map<String, List<Double>> getPriceHistory(String productName, int days) {
        // W rzeczywistości pobierałoby z bazy historycznej
        // Tutaj symulacja

        Map<String, List<Double>> history = new HashMap<>();
        String[] stores = {"Biedronka", "Lidl", "Carrefour", "Auchan"};

        Random random = new Random(productName.hashCode());

        for (String store : stores) {
            List<Double> prices = new ArrayList<>();
            double basePrice = 5.0 + random.nextDouble() * 15.0; // 5-20 zł

            for (int i = 0; i < days; i++) {
                double variation = 0.9 + (random.nextDouble() * 0.2); // 0.9-1.1
                double price = Math.round(basePrice * variation * 100.0) / 100.0;
                prices.add(price);
            }

            history.put(store, prices);
        }

        return history;
    }
}