package org.example.shop.shopping;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/prices")
@CrossOrigin("*")
public class PriceDataController {

    private final PriceService priceService;
    private final ProductPriceRepository productPriceRepository;
    private final ShoppingService shoppingService;

    public PriceDataController(PriceService priceService,
                               ProductPriceRepository productPriceRepository,
                               ShoppingService shoppingService) {
        this.priceService = priceService;
        this.productPriceRepository = productPriceRepository;
        this.shoppingService = shoppingService;
    }

    /**
     * Inicjalizuj przykładowe dane cenowe
     */
    @PostMapping("/init-sample-data")
    public ResponseEntity<?> initSampleData() {
        try {
            List<ProductPrice> sampleProducts = createSampleProductPrices();
            productPriceRepository.saveAll(sampleProducts);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Zainicjalizowano " + sampleProducts.size() + " przykładowych produktów",
                    "count", sampleProducts.size(),
                    "products", sampleProducts.stream()
                            .map(ProductPrice::getProductName)
                            .toList()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "Błąd podczas inicjalizacji danych"
            ));
        }
    }

    /**
     * Pobierz ceny dla konkretnego produktu
     */
    @GetMapping("/product/{productName}")
    public ResponseEntity<?> getProductPrices(@PathVariable String productName) {
        try {
            Map<String, Double> prices = priceService.getPricesForProduct(productName);

            // Znajdź najtańszy sklep i cenę
            String cheapestStore = findCheapestStore(prices);
            Double cheapestPrice = findCheapestPrice(prices);
            Double averagePrice = calculateAveragePrice(prices);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "productName", productName,
                    "prices", prices,
                    "cheapestStore", cheapestStore,
                    "cheapestPrice", cheapestPrice,
                    "averagePrice", averagePrice,
                    "storeCount", prices.size(),
                    "message", "Znaleziono ceny dla " + productName
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "productName", productName,
                    "error", e.getMessage(),
                    "message", "Błąd pobierania cen dla " + productName
            ));
        }
    }

    /**
     * Porównaj wiele produktów (nowa wersja z quantities)
     */
    @PostMapping("/compare")
    public ResponseEntity<?> compareProducts(@RequestBody CompareRequest request) {
        try {
            System.out.println("Porównywanie produktów: " + request.getProductNames());
            System.out.println("Ilości: " + request.getQuantities());

            // Pobierz ilości lub użyj domyślnych
            Map<String, Integer> quantities = request.getQuantities();
            if (quantities == null || quantities.isEmpty()) {
                quantities = new HashMap<>();
                for (String product : request.getProductNames()) {
                    quantities.put(product, 1);
                }
            }

            // Sprawdź czy wszystkie produkty mają ilości
            for (String product : request.getProductNames()) {
                if (!quantities.containsKey(product)) {
                    quantities.put(product, 1);
                }
            }

            Map<String, Object> comparisonResult = priceService.compareProductsWithDetails(
                    request.getProductNames(),
                    quantities
            );

            // Dodaj podsumowanie
            Map<String, Object> summary = new HashMap<>();
            summary.put("productCount", request.getProductNames().size());
            summary.put("totalQuantity", quantities.values().stream().mapToInt(Integer::intValue).sum());
            summary.put("storesCompared", ((StoreSummary) comparisonResult.get("summary")).getStoreTotals().size());

            comparisonResult.put("summaryDetails", summary);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", comparisonResult,
                    "message", "Porównanie " + request.getProductNames().size() + " produktów zakończone sukcesem"
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "Błąd podczas porównywania produktów"
            ));
        }
    }

    /**
     * Porównaj listę zakupów (przez ID listy)
     */
    @PostMapping("/compare-shopping-list/{listId}")
    public ResponseEntity<?> compareShoppingList(
            @PathVariable String listId,
            @RequestParam String userId) {
        try {
            System.out.println("Porównywanie listy ID: " + listId + " dla użytkownika: " + userId);

            // Pobierz listę z bazy
            Optional<ShoppingList> listOpt = shoppingService.getList(userId, listId);

            if (listOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Nie znaleziono listy o ID: " + listId
                ));
            }

            ShoppingList shoppingList = listOpt.get();

            if (shoppingList.getItems() == null || shoppingList.getItems().isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Lista jest pusta",
                        "listName", shoppingList.getName(),
                        "data", Map.of(
                                "listName", shoppingList.getName(),
                                "itemCount", 0,
                                "bestStore", null,
                                "bestPrice", 0.0
                        )
                ));
            }

            // Przygotuj dane do porównania
            List<String> productNames = new ArrayList<>();
            Map<String, Integer> quantities = new HashMap<>();

            for (ShoppingItem item : shoppingList.getItems()) {
                productNames.add(item.getName());
                quantities.put(item.getName(), item.getQuantity());
            }

            Map<String, Object> comparisonResult = priceService.compareProductsWithDetails(
                    productNames,
                    quantities
            );

            // Dodaj informacje o liście
            comparisonResult.put("listId", listId);
            comparisonResult.put("listName", shoppingList.getName());
            comparisonResult.put("listDescription", shoppingList.getDescription());
            comparisonResult.put("itemCount", shoppingList.getItems().size());
            comparisonResult.put("createdAt", shoppingList.getCreatedAt());

            // Dodaj podsumowanie
            Map<String, Object> summary = new HashMap<>();
            summary.put("totalProducts", productNames.size());
            summary.put("totalItems", quantities.values().stream().mapToInt(Integer::intValue).sum());

            comparisonResult.put("summary", summary);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", comparisonResult,
                    "message", "Porównanie listy '" + shoppingList.getName() + "' zakończone sukcesem"
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "Błąd podczas porównywania listy"
            ));
        }
    }

    /**
     * Pobierz strategie zakupowe dla listy produktów
     */
    @PostMapping("/shopping-strategies")
    public ResponseEntity<?> getShoppingStrategies(@RequestBody CompareRequest request) {
        try {
            Map<String, Integer> quantities = request.getQuantities();
            if (quantities == null || quantities.isEmpty()) {
                quantities = new HashMap<>();
                for (String product : request.getProductNames()) {
                    quantities.put(product, 1);
                }
            }

            Map<String, Map<String, Double>> strategies =
                    priceService.calculateShoppingStrategies(request.getProductNames(), quantities);

            // Znajdź najlepszą strategię
            String bestStrategy = null;
            double bestPrice = Double.MAX_VALUE;
            int bestStoreCount = Integer.MAX_VALUE;

            for (Map.Entry<String, Map<String, Double>> entry : strategies.entrySet()) {
                double price = entry.getValue().get("total");
                double storeCount = entry.getValue().get("storeCount");

                // Preferuj strategie z mniejszą liczbą sklepów przy podobnych cenach
                if (price < bestPrice || (Math.abs(price - bestPrice) < 5 && storeCount < bestStoreCount)) {
                    bestPrice = price;
                    bestStoreCount = (int) storeCount;
                    bestStrategy = entry.getKey();
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "strategies", strategies,
                    "recommendedStrategy", bestStrategy,
                    "recommendedPrice", bestPrice,
                    "recommendedStoreCount", bestStoreCount,
                    "message", "Znaleziono " + strategies.size() + " strategii zakupowych"
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "Błąd obliczania strategii"
            ));
        }
    }

    /**
     * Pobierz ceny dla wielu produktów na raz
     */
    @PostMapping("/batch")
    public ResponseEntity<?> getBatchPrices(@RequestBody List<String> productNames) {
        try {
            Map<String, Map<String, Double>> allPrices = priceService.getPricesForProducts(productNames);

            // Oblicz statystyki
            Map<String, Object> statistics = new HashMap<>();
            statistics.put("totalProducts", productNames.size());
            statistics.put("productsWithPrices", allPrices.size());

            // Oblicz średnie oszczędności
            double totalPotentialSavings = 0;
            int productsWithMultiplePrices = 0;

            for (Map<String, Double> prices : allPrices.values()) {
                List<Double> validPrices = prices.values().stream()
                        .filter(price -> price > 0)
                        .toList();

                if (validPrices.size() >= 2) {
                    double minPrice = Collections.min(validPrices);
                    double maxPrice = Collections.max(validPrices);
                    totalPotentialSavings += (maxPrice - minPrice);
                    productsWithMultiplePrices++;
                }
            }

            statistics.put("averageSavingsPerProduct",
                    productsWithMultiplePrices > 0 ?
                            Math.round((totalPotentialSavings / productsWithMultiplePrices) * 100.0) / 100.0 : 0);
            statistics.put("productsWithMultiplePrices", productsWithMultiplePrices);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "prices", allPrices,
                    "statistics", statistics,
                    "message", "Pobrano ceny dla " + productNames.size() + " produktów"
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "Błąd pobierania cen wsadowych"
            ));
        }
    }

    /**
     * Pobierz produkty z największymi różnicami cen
     */
    @GetMapping("/biggest-differences")
    public ResponseEntity<?> getProductsWithBiggestPriceDifferences(
            @RequestParam(defaultValue = "10") int limit) {
        try {
            // Pobierz wszystkie produkty z bazy
            List<ProductPrice> allProducts = productPriceRepository.findAll();

            // Oblicz różnice cen dla każdego produktu
            List<Map<String, Object>> productsWithDifferences = new ArrayList<>();

            for (ProductPrice product : allProducts) {
                Map<String, Double> prices = product.getStorePrices();
                if (prices == null || prices.size() < 2) continue;

                List<Double> validPrices = prices.values().stream()
                        .filter(price -> price > 0)
                        .toList();

                if (validPrices.size() >= 2) {
                    double minPrice = Collections.min(validPrices);
                    double maxPrice = Collections.max(validPrices);
                    double difference = maxPrice - minPrice;
                    double differencePercentage = (difference / minPrice) * 100;

                    // Znajdź sklepy z min i max ceną
                    String cheapestStore = "";
                    String mostExpensiveStore = "";

                    for (Map.Entry<String, Double> entry : prices.entrySet()) {
                        if (entry.getValue() == minPrice) cheapestStore = entry.getKey();
                        if (entry.getValue() == maxPrice) mostExpensiveStore = entry.getKey();
                    }

                    productsWithDifferences.add(Map.of(
                            "productName", product.getProductName(),
                            "category", product.getCategory(),
                            "cheapestStore", cheapestStore,
                            "cheapestPrice", minPrice,
                            "mostExpensiveStore", mostExpensiveStore,
                            "mostExpensivePrice", maxPrice,
                            "priceDifference", Math.round(difference * 100.0) / 100.0,
                            "differencePercentage", Math.round(differencePercentage * 10.0) / 10.0,
                            "storeCount", validPrices.size()
                    ));
                }
            }

            // Posortuj po różnicy cen (malejąco)
            productsWithDifferences.sort((a, b) ->
                    Double.compare((Double) b.get("priceDifference"), (Double) a.get("priceDifference")));

            // Ogranicz do limit
            if (productsWithDifferences.size() > limit) {
                productsWithDifferences = productsWithDifferences.subList(0, limit);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "products", productsWithDifferences,
                    "count", productsWithDifferences.size(),
                    "message", "Znaleziono produkty z największymi różnicami cen"
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "Błąd pobierania różnic cen"
            ));
        }
    }

    /**
     * Pobierz średnie ceny według kategorii
     */
    @GetMapping("/category-averages")
    public ResponseEntity<?> getCategoryAveragePrices() {
        try {
            List<ProductPrice> allProducts = productPriceRepository.findAll();

            Map<String, List<Double>> categoryPrices = new HashMap<>();
            Map<String, Integer> categoryCounts = new HashMap<>();

            for (ProductPrice product : allProducts) {
                String category = product.getCategory() != null ? product.getCategory() : "Inne";
                Map<String, Double> prices = product.getStorePrices();

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

            // Oblicz średnie dla każdej kategorii
            List<Map<String, Object>> categoryAverages = new ArrayList<>();

            for (Map.Entry<String, List<Double>> entry : categoryPrices.entrySet()) {
                String category = entry.getKey();
                List<Double> prices = entry.getValue();

                double average = prices.stream()
                        .mapToDouble(Double::doubleValue)
                        .average()
                        .orElse(0.0);

                double min = prices.stream()
                        .mapToDouble(Double::doubleValue)
                        .min()
                        .orElse(0.0);

                double max = prices.stream()
                        .mapToDouble(Double::doubleValue)
                        .max()
                        .orElse(0.0);

                categoryAverages.add(Map.of(
                        "category", category,
                        "averagePrice", Math.round(average * 100.0) / 100.0,
                        "minPrice", Math.round(min * 100.0) / 100.0,
                        "maxPrice", Math.round(max * 100.0) / 100.0,
                        "priceRange", Math.round((max - min) * 100.0) / 100.0,
                        "productCount", categoryCounts.get(category)
                ));
            }

            // Posortuj po średniej cenie
            categoryAverages.sort((a, b) ->
                    Double.compare((Double) b.get("averagePrice"), (Double) a.get("averagePrice")));

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "categories", categoryAverages,
                    "totalCategories", categoryAverages.size(),
                    "message", "Pobrano średnie ceny według kategorii"
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "Błąd pobierania średnich cen"
            ));
        }
    }

    /**
     * Wyszukaj produkty po nazwie
     */
    @GetMapping("/search")
    public ResponseEntity<?> searchProducts(@RequestParam String query) {
        try {
            List<ProductPrice> foundProducts = productPriceRepository
                    .findByProductNameContainingIgnoreCase(query);

            List<Map<String, Object>> results = new ArrayList<>();

            for (ProductPrice product : foundProducts) {
                Map<String, Double> prices = product.getStorePrices();
                String cheapestStore = findCheapestStore(prices);
                Double cheapestPrice = findCheapestPrice(prices);

                results.add(Map.of(
                        "productName", product.getProductName(),
                        "category", product.getCategory(),
                        "cheapestStore", cheapestStore,
                        "cheapestPrice", cheapestPrice,
                        "storeCount", prices != null ? prices.size() : 0,
                        "lastUpdated", product.getLastUpdated()
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "results", results,
                    "count", results.size(),
                    "query", query,
                    "message", "Znaleziono " + results.size() + " produktów"
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "Błąd wyszukiwania produktów"
            ));
        }
    }

    /**
     * Pobierz najtańsze produkty w kategorii
     */
    @GetMapping("/category/{category}/cheapest")
    public ResponseEntity<?> getCheapestProductsInCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "5") int limit) {
        try {
            List<ProductPrice> categoryProducts = productPriceRepository
                    .findByCategoryIgnoreCase(category);

            List<Map<String, Object>> productsWithPrices = new ArrayList<>();

            for (ProductPrice product : categoryProducts) {
                Map<String, Double> prices = product.getStorePrices();
                if (prices == null || prices.isEmpty()) continue;

                Double cheapestPrice = findCheapestPrice(prices);
                if (cheapestPrice == null || cheapestPrice <= 0) continue;

                String cheapestStore = findCheapestStore(prices);

                productsWithPrices.add(Map.of(
                        "productName", product.getProductName(),
                        "cheapestPrice", cheapestPrice,
                        "cheapestStore", cheapestStore,
                        "averagePrice", calculateAveragePrice(prices),
                        "storeCount", prices.size()
                ));
            }

            // Posortuj po cenie (rosnąco) i ogranicz
            productsWithPrices.sort((a, b) ->
                    Double.compare((Double) a.get("cheapestPrice"), (Double) b.get("cheapestPrice")));

            if (productsWithPrices.size() > limit) {
                productsWithPrices = productsWithPrices.subList(0, limit);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "category", category,
                    "products", productsWithPrices,
                    "count", productsWithPrices.size(),
                    "message", "Znaleziono " + productsWithPrices.size() + " najtańszych produktów w kategorii " + category
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "Błąd pobierania najtańszych produktów"
            ));
        }
    }

    // ========== METODY POMOCNICZE ==========

    private String findCheapestStore(Map<String, Double> prices) {
        if (prices == null || prices.isEmpty()) return "Brak danych";

        return prices.entrySet().stream()
                .filter(entry -> entry.getValue() > 0)
                .min(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("Brak danych");
    }

    private Double findCheapestPrice(Map<String, Double> prices) {
        if (prices == null || prices.isEmpty()) return 0.0;

        return prices.values().stream()
                .filter(price -> price > 0)
                .min(Double::compare)
                .orElse(0.0);
    }

    private Double calculateAveragePrice(Map<String, Double> prices) {
        if (prices == null || prices.isEmpty()) return 0.0;

        double sum = prices.values().stream()
                .filter(price -> price > 0)
                .mapToDouble(Double::doubleValue)
                .sum();

        long count = prices.values().stream()
                .filter(price -> price > 0)
                .count();

        return count > 0 ? Math.round((sum / count) * 100.0) / 100.0 : 0.0;
    }

    private List<ProductPrice> createSampleProductPrices() {
        List<ProductPrice> products = new ArrayList<>();

        // Przykładowe produkty z rzeczywistymi cenami
        Map<String, Double> milkPrices = Map.of(
                "Biedronka", 3.20,
                "Lidl", 3.10,
                "Carrefour", 3.50,
                "Auchan", 3.30,
                "Żabka", 4.00
        );
        products.add(createProductPrice("Mleko", "Nabiał", milkPrices));

        Map<String, Double> breadPrices = Map.of(
                "Biedronka", 4.50,
                "Lidl", 4.20,
                "Carrefour", 4.80,
                "Auchan", 4.60,
                "Piekarnia", 5.00
        );
        products.add(createProductPrice("Chleb", "Pieczywo", breadPrices));

        Map<String, Double> eggsPrices = Map.of(
                "Biedronka", 12.00,
                "Lidl", 11.50,
                "Carrefour", 13.00,
                "Auchan", 12.50
        );
        products.add(createProductPrice("Jajka", "Nabiał", eggsPrices));

        // Dodaj więcej produktów...
        products.add(createProductPrice("Masło", "Nabiał", createPrices(6.0)));
        products.add(createProductPrice("Ser żółty", "Nabiał", createPrices(8.0)));
        products.add(createProductPrice("Woda mineralna", "Napoje", createPrices(1.5)));
        products.add(createProductPrice("Coca-Cola", "Napoje", createPrices(5.0)));
        products.add(createProductPrice("Kawa", "Napoje", createPrices(15.0)));
        products.add(createProductPrice("Herbata", "Napoje", createPrices(8.0)));
        products.add(createProductPrice("Cukier", "Słodycze", createPrices(4.0)));
        products.add(createProductPrice("Mąka", "Produkty sypkie", createPrices(3.0)));
        products.add(createProductPrice("Ryż", "Produkty sypkie", createPrices(4.0)));
        products.add(createProductPrice("Makaron", "Produkty sypkie", createPrices(3.5)));
        products.add(createProductPrice("Pomidor", "Warzywa", createPrices(8.0)));
        products.add(createProductPrice("Ogórek", "Warzywa", createPrices(5.0)));
        products.add(createProductPrice("Marchew", "Warzywa", createPrices(3.0)));
        products.add(createProductPrice("Ziemniaki", "Warzywa", createPrices(2.5)));
        products.add(createProductPrice("Jabłka", "Owoce", createPrices(6.0)));
        products.add(createProductPrice("Banany", "Owoce", createPrices(8.0)));
        products.add(createProductPrice("Kurczak", "Mięso", createPrices(15.0)));
        products.add(createProductPrice("Wieprzowina", "Mięso", createPrices(20.0)));
        products.add(createProductPrice("Wędlina", "Mięso", createPrices(25.0)));
        products.add(createProductPrice("Ryba", "Mięso", createPrices(18.0)));

        return products;
    }

    private ProductPrice createProductPrice(String name, String category, Map<String, Double> prices) {
        ProductPrice product = new ProductPrice(name, category);
        product.setStorePrices(prices);
        return product;
    }

    private Map<String, Double> createPrices(double basePrice) {
        Map<String, Double> prices = new HashMap<>();
        prices.put("Biedronka", round(basePrice * 0.95));
        prices.put("Lidl", round(basePrice * 0.90));
        prices.put("Carrefour", round(basePrice * 1.05));
        prices.put("Auchan", round(basePrice * 1.10));
        prices.put("Żabka", round(basePrice * 1.20));
        return prices;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}

// ========== KLASY DTO ==========

class CompareRequest {
    private List<String> productNames;
    private Map<String, Integer> quantities;

    // Gettery i settery
    public List<String> getProductNames() {
        return productNames != null ? productNames : new ArrayList<>();
    }
    public void setProductNames(List<String> productNames) {
        this.productNames = productNames;
    }

    public Map<String, Integer> getQuantities() {
        return quantities != null ? quantities : new HashMap<>();
    }
    public void setQuantities(Map<String, Integer> quantities) {
        this.quantities = quantities;
    }

    @Override
    public String toString() {
        return "CompareRequest{" +
                "productNames=" + productNames +
                ", quantities=" + quantities +
                '}';
    }
}

class ShoppingListCompareRequest {
    private ShoppingList shoppingList;

    public ShoppingList getShoppingList() { return shoppingList; }
    public void setShoppingList(ShoppingList shoppingList) { this.shoppingList = shoppingList; }
}