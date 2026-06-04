package org.example.shop.shopping;

import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class PriceService {

    private final ProductPriceRepository productPriceRepository;
    private final StoreRepository storeRepository;

    public PriceService(ProductPriceRepository productPriceRepository,
                        StoreRepository storeRepository) {
        this.productPriceRepository = productPriceRepository;
        this.storeRepository = storeRepository;
    }

    /**
     * Oblicz najlepszy sklep dla listy produktów z ilościami
     */
    public StoreSummary calculateBestStoreForProducts(Map<String, Integer> productsWithQuantities) {
        StoreSummary summary = new StoreSummary();

        // Pobierz wszystkie aktywne sklepy
        List<Store> stores = storeRepository.findByIsActiveTrue();

        if (stores.isEmpty()) {
            stores = getDefaultStores();
        }

        // Dla każdego sklepu oblicz całkowity koszt
        for (Store store : stores) {
            double total = 0.0;
            boolean hasPrices = false;

            for (Map.Entry<String, Integer> entry : productsWithQuantities.entrySet()) {
                String productName = entry.getKey();
                int quantity = entry.getValue();

                Map<String, Double> prices = getPricesForProduct(productName);
                Double price = prices.get(store.getName());

                if (price != null && price > 0) {
                    total += price * quantity;
                    hasPrices = true;
                }
            }

            if (hasPrices) {
                summary.addStoreTotal(store.getName(), Math.round(total * 100.0) / 100.0);
                System.out.println("Sklep " + store.getName() + ": " + total + " zł");
            }
        }

        summary.calculateBest();

        if (summary.getBestStore() != null) {
            System.out.println("Najlepszy sklep dla produktów: " + summary.getBestStore() +
                    " za " + summary.getBestPrice() + " zł");
        } else {
            System.out.println("Nie można obliczyć najlepszego sklepu - brak cen");
        }

        return summary;
    }

    /**
     * Oblicz najtańszy sklep dla pojedynczej listy zakupów
     */
    public StoreSummary calculateBestStoreForShoppingList(ShoppingList shoppingList) {
        StoreSummary summary = new StoreSummary();

        if (shoppingList == null || shoppingList.getItems() == null || shoppingList.getItems().isEmpty()) {
            return summary;
        }

        // Pobierz wszystkie aktywne sklepy
        List<Store> stores = storeRepository.findByIsActiveTrue();

        if (stores.isEmpty()) {
            stores = getDefaultStores();
        }

        // Dla każdego sklepu oblicz całkowity koszt
        for (Store store : stores) {
            double total = 0.0;
            boolean hasPrices = false;

            for (ShoppingItem item : shoppingList.getItems()) {
                Map<String, Double> prices = getPricesForProduct(item.getName());
                Double price = prices.get(store.getName());

                if (price != null && price > 0) {
                    total += price * item.getQuantity();
                    hasPrices = true;
                }
            }

            if (hasPrices) {
                summary.addStoreTotal(store.getName(), Math.round(total * 100.0) / 100.0);
            }
        }

        summary.calculateBest();
        return summary;
    }

    /**
     * Porównaj ceny między sklepami i zwróć szczegółowe informacje
     */
    public Map<String, Object> compareProductsWithDetails(List<String> productNames, Map<String, Integer> quantities) {
        Map<String, Object> result = new HashMap<>();

        // Pobierz ceny dla wszystkich produktów
        Map<String, Map<String, Double>> allPrices = getPricesForProducts(productNames);
        result.put("products", allPrices);

        // Oblicz najlepszy sklep
        StoreSummary summary = calculateBestStoreForProducts(quantities);
        result.put("summary", summary);
        result.put("bestStore", summary.getBestStore());
        result.put("bestPrice", summary.getBestPrice());

        // Oblicz szczegółowe statystyki
        Map<String, Object> statistics = calculatePriceStatistics(allPrices, quantities);
        result.put("statistics", statistics);

        // Znajdź rekomendacje
        List<String> recommendations = generateRecommendations(allPrices, summary);
        result.put("recommendations", recommendations);

        return result;
    }

    /**
     * Oblicz statystyki cenowe
     */
    private Map<String, Object> calculatePriceStatistics(Map<String, Map<String, Double>> allPrices,
                                                         Map<String, Integer> quantities) {
        Map<String, Object> stats = new HashMap<>();

        // Oblicz średnią cenę dla każdego produktu
        Map<String, Double> averagePrices = new HashMap<>();
        Map<String, Double> priceRanges = new HashMap<>();

        for (Map.Entry<String, Map<String, Double>> entry : allPrices.entrySet()) {
            String productName = entry.getKey();
            Map<String, Double> prices = entry.getValue();

            // Oblicz średnią cenę (pomijając zera)
            double sum = 0;
            int count = 0;
            double min = Double.MAX_VALUE;
            double max = 0;

            for (Double price : prices.values()) {
                if (price > 0) {
                    sum += price;
                    count++;
                    if (price < min) min = price;
                    if (price > max) max = price;
                }
            }

            if (count > 0) {
                double average = sum / count;
                averagePrices.put(productName, Math.round(average * 100.0) / 100.0);
                priceRanges.put(productName, Math.round((max - min) * 100.0) / 100.0);
            }
        }

        stats.put("averagePrices", averagePrices);
        stats.put("priceRanges", priceRanges);

        // Oblicz całkowitą oszczędność przy wyborze najlepszego sklepu
        if (!allPrices.isEmpty() && !quantities.isEmpty()) {
            double maxTotal = 0;
            double minTotal = Double.MAX_VALUE;

            // Znajdź najdroższy i najtańszy sklep
            List<Store> stores = storeRepository.findByIsActiveTrue();
            if (stores.isEmpty()) stores = getDefaultStores();

            for (Store store : stores) {
                double storeTotal = 0;
                boolean hasPrices = false;

                for (Map.Entry<String, Integer> entry : quantities.entrySet()) {
                    String productName = entry.getKey();
                    int quantity = entry.getValue();

                    Map<String, Double> prices = allPrices.get(productName);
                    if (prices != null) {
                        Double price = prices.get(store.getName());
                        if (price != null && price > 0) {
                            storeTotal += price * quantity;
                            hasPrices = true;
                        }
                    }
                }

                if (hasPrices) {
                    if (storeTotal > maxTotal) maxTotal = storeTotal;
                    if (storeTotal < minTotal) minTotal = storeTotal;
                }
            }

            if (maxTotal > 0 && minTotal < Double.MAX_VALUE) {
                double potentialSavings = maxTotal - minTotal;
                stats.put("potentialSavings", Math.round(potentialSavings * 100.0) / 100.0);
                stats.put("savingsPercentage",
                        Math.round((potentialSavings / maxTotal * 100.0) * 10.0) / 10.0);
            }
        }

        return stats;
    }

    /**
     * Generuj rekomendacje na podstawie cen
     */
    private List<String> generateRecommendations(Map<String, Map<String, Double>> allPrices,
                                                 StoreSummary summary) {
        List<String> recommendations = new ArrayList<>();

        if (allPrices.isEmpty() || summary.getBestStore() == null) {
            return recommendations;
        }

        String bestStore = summary.getBestStore();

        // Sprawdź które produkty są najtańsze w innym sklepie niż ogólny najlepszy
        for (Map.Entry<String, Map<String, Double>> entry : allPrices.entrySet()) {
            String productName = entry.getKey();
            Map<String, Double> prices = entry.getValue();

            // Znajdź najtańszy sklep dla tego produktu
            String cheapestStoreForProduct = null;
            double cheapestPrice = Double.MAX_VALUE;

            for (Map.Entry<String, Double> priceEntry : prices.entrySet()) {
                if (priceEntry.getValue() > 0 && priceEntry.getValue() < cheapestPrice) {
                    cheapestPrice = priceEntry.getValue();
                    cheapestStoreForProduct = priceEntry.getKey();
                }
            }

            // Jeśli najlepszy sklep dla produktu jest inny niż ogólny najlepszy
            if (cheapestStoreForProduct != null && !cheapestStoreForProduct.equals(bestStore)) {
                Double priceInBestStore = prices.get(bestStore);
                if (priceInBestStore != null && priceInBestStore > cheapestPrice) {
                    double difference = priceInBestStore - cheapestPrice;
                    recommendations.add(String.format(
                            "Produkt '%s' jest tańszy o %.2f zł w sklepie %s niż w %s",
                            productName, difference, cheapestStoreForProduct, bestStore
                    ));
                }
            }
        }

        // Jeśli za dużo rekomendacji, ogranicz do 3
        if (recommendations.size() > 3) {
            recommendations = recommendations.subList(0, 3);
        }

        return recommendations;
    }

    /**
     * Znajdź sklepy z największą liczbą najtańszych produktów
     */
    public Map<String, Integer> findStoresWithMostCheapestProducts(List<String> productNames) {
        Map<String, Integer> storeCounts = new HashMap<>();

        for (String productName : productNames) {
            Map<String, Double> prices = getPricesForProduct(productName);

            // Znajdź minimalną cenę
            double minPrice = Double.MAX_VALUE;
            for (Double price : prices.values()) {
                if (price > 0 && price < minPrice) {
                    minPrice = price;
                }
            }

            // Zlicz sklepy z minimalną ceną
            for (Map.Entry<String, Double> entry : prices.entrySet()) {
                if (entry.getValue() == minPrice) {
                    storeCounts.put(entry.getKey(), storeCounts.getOrDefault(entry.getKey(), 0) + 1);
                }
            }
        }

        return storeCounts;
    }

    /**
     * Oblicz koszt zakupów w różnych kombinacjach sklepów
     */
    public Map<String, Map<String, Double>> calculateShoppingStrategies(
            List<String> productNames,
            Map<String, Integer> quantities) {

        Map<String, Map<String, Double>> strategies = new HashMap<>();

        // Strategia 1: Kup wszystko w jednym sklepie (najtańszym ogólnie)
        StoreSummary summary = calculateBestStoreForProducts(quantities);
        if (summary.getBestStore() != null) {
            Map<String, Double> allInOne = new HashMap<>();
            allInOne.put("total", summary.getBestPrice());
            allInOne.put("storeCount", 1.0);
            strategies.put("allInOneStore", allInOne);
        }

        // Strategia 2: Kup każdy produkt w najtańszym dla niego sklepie
        double optimalTotal = 0;
        int optimalStoreCount = 0;
        Set<String> optimalStores = new HashSet<>();

        for (String productName : productNames) {
            Map<String, Double> prices = getPricesForProduct(productName);
            int quantity = quantities.getOrDefault(productName, 1);

            // Znajdź najtańszy sklep dla tego produktu
            String cheapestStore = null;
            double cheapestPrice = Double.MAX_VALUE;

            for (Map.Entry<String, Double> entry : prices.entrySet()) {
                if (entry.getValue() > 0 && entry.getValue() < cheapestPrice) {
                    cheapestPrice = entry.getValue();
                    cheapestStore = entry.getKey();
                }
            }

            if (cheapestStore != null) {
                optimalTotal += cheapestPrice * quantity;
                optimalStores.add(cheapestStore);
            }
        }

        Map<String, Double> optimalStrategy = new HashMap<>();
        optimalStrategy.put("total", Math.round(optimalTotal * 100.0) / 100.0);
        optimalStrategy.put("storeCount", (double) optimalStores.size());
        strategies.put("optimalPerProduct", optimalStrategy);

        // Strategia 3: Kompromis - maksymalnie 2 sklepy
        if (optimalStores.size() > 2) {
            double twoStoreTotal = calculateTwoStoreStrategy(productNames, quantities, optimalStores);
            Map<String, Double> twoStoreStrategy = new HashMap<>();
            twoStoreStrategy.put("total", Math.round(twoStoreTotal * 100.0) / 100.0);
            twoStoreStrategy.put("storeCount", 2.0);
            strategies.put("twoStoreCompromise", twoStoreStrategy);
        }

        return strategies;
    }

    /**
     * Oblicz strategię z maksymalnie 2 sklepami
     */
    private double calculateTwoStoreStrategy(List<String> productNames,
                                             Map<String, Integer> quantities,
                                             Set<String> allStores) {
        double bestTwoStoreTotal = Double.MAX_VALUE;

        // Przetestuj wszystkie pary sklepów
        List<String> storeList = new ArrayList<>(allStores);

        for (int i = 0; i < storeList.size(); i++) {
            for (int j = i + 1; j < storeList.size(); j++) {
                String store1 = storeList.get(i);
                String store2 = storeList.get(j);

                double total = 0;

                for (String productName : productNames) {
                    Map<String, Double> prices = getPricesForProduct(productName);
                    int quantity = quantities.getOrDefault(productName, 1);

                    Double price1 = prices.get(store1);
                    Double price2 = prices.get(store2);

                    // Wybierz tańszy z dwóch sklepów
                    double chosenPrice;
                    if (price1 == null || price1 <= 0) {
                        chosenPrice = (price2 != null && price2 > 0) ? price2 : 0;
                    } else if (price2 == null || price2 <= 0) {
                        chosenPrice = price1;
                    } else {
                        chosenPrice = Math.min(price1, price2);
                    }

                    total += chosenPrice * quantity;
                }

                if (total < bestTwoStoreTotal) {
                    bestTwoStoreTotal = total;
                }
            }
        }

        return bestTwoStoreTotal;
    }

    // Reszta metod PriceService pozostaje bez zmian...
    // (getPricesForProduct, generateRealisticPrices, determineBasePrice, itd.)

    /**
     * Pobierz ceny dla produktu z bazy danych
     */
    public Map<String, Double> getPricesForProduct(String productName) {
        System.out.println("Pobieranie cen dla produktu: " + productName);

        Optional<ProductPrice> priceOpt = productPriceRepository.findByProductNameIgnoreCase(productName);

        if (priceOpt.isPresent()) {
            ProductPrice productPrice = priceOpt.get();
            System.out.println("Znaleziono ceny w bazie: " + productPrice.getStorePrices());
            return productPrice.getStorePrices();
        } else {
            System.out.println("Brak cen w bazie, generuję przykładowe dla: " + productName);
            return generateRealisticPrices(productName);
        }
    }

    /**
     * Pobierz ceny dla wielu produktów na raz
     */
    public Map<String, Map<String, Double>> getPricesForProducts(List<String> productNames) {
        Map<String, Map<String, Double>> result = new HashMap<>();

        for (String productName : productNames) {
            result.put(productName, getPricesForProduct(productName));
        }

        return result;
    }

    /**
     * Generuj realistyczne ceny na podstawie nazwy produktu
     */
    private Map<String, Double> generateRealisticPrices(String productName) {
        Map<String, Double> prices = new HashMap<>();

        // Pobierz aktywne sklepy z bazy
        List<Store> stores = storeRepository.findByIsActiveTrue();

        if (stores.isEmpty()) {
            stores = getDefaultStores();
        }

        // Ustal bazową cenę na podstawie kategorii produktu
        double basePrice = determineBasePrice(productName);
        String category = determineCategory(productName);

        System.out.println("Bazowa cena dla '" + productName + "' (" + category + "): " + basePrice);

        // Dla każdego sklepu ustal cenę
        for (Store store : stores) {
            double storePrice = calculateStorePrice(basePrice, store.getName());
            prices.put(store.getName(), storePrice);

            System.out.println("  " + store.getName() + ": " + storePrice + " zł");
        }

        // Zapisz wygenerowane ceny do bazy dla przyszłych użyć
        saveGeneratedPrices(productName, category, prices);

        return prices;
    }

    /**
     * Określ bazową cenę na podstawie nazwy produktu
     */
    private double determineBasePrice(String productName) {
        String nameLower = productName.toLowerCase();

        // Nabiał
        if (nameLower.contains("mleko")) return 3.0;
        if (nameLower.contains("jogurt")) return 2.5;
        if (nameLower.contains("kefir")) return 3.5;
        if (nameLower.contains("maślanka")) return 2.0;
        if (nameLower.contains("śmietana")) return 4.0;
        if (nameLower.contains("masło")) return 6.0;
        if (nameLower.contains("ser") && !nameLower.contains("żółty")) return 5.0;
        if (nameLower.contains("ser żółty")) return 8.0;
        if (nameLower.contains("twaróg")) return 4.0;
        if (nameLower.contains("jajka") || nameLower.contains("jaja")) return 12.0;

        // Pieczywo
        if (nameLower.contains("chleb")) return 4.0;
        if (nameLower.contains("bułka")) return 0.5;
        if (nameLower.contains("bagietka")) return 2.0;
        if (nameLower.contains("rogal")) return 1.5;
        if (nameLower.contains("drożdżówka")) return 2.5;

        // Mięso
        if (nameLower.contains("kurczak")) return 15.0;
        if (nameLower.contains("indyk")) return 18.0;
        if (nameLower.contains("wieprzowina")) return 20.0;
        if (nameLower.contains("wołowina")) return 30.0;
        if (nameLower.contains("schab")) return 22.0;
        if (nameLower.contains("udko")) return 16.0;
        if (nameLower.contains("skrzydełka")) return 12.0;
        if (nameLower.contains("ryba")) return 18.0;
        if (nameLower.contains("łosoś")) return 35.0;
        if (nameLower.contains("dorsz")) return 20.0;
        if (nameLower.contains("mintaj")) return 15.0;

        // Wędliny
        if (nameLower.contains("szynka")) return 25.0;
        if (nameLower.contains("kiełbasa")) return 20.0;
        if (nameLower.contains("parówki")) return 12.0;
        if (nameLower.contains("salami")) return 28.0;
        if (nameLower.contains("wędlina")) return 22.0;
        if (nameLower.contains("baleron")) return 24.0;

        // Warzywa
        if (nameLower.contains("pomidor")) return 8.0;
        if (nameLower.contains("ogórek")) return 5.0;
        if (nameLower.contains("marchew")) return 3.0;
        if (nameLower.contains("ziemniaki")) return 2.5;
        if (nameLower.contains("cebula")) return 2.0;
        if (nameLower.contains("czosnek")) return 15.0;
        if (nameLower.contains("papryka")) return 10.0;
        if (nameLower.contains("sałata")) return 4.0;
        if (nameLower.contains("kapusta")) return 3.0;
        if (nameLower.contains("kalafior")) return 6.0;
        if (nameLower.contains("brokuł")) return 7.0;
        if (nameLower.contains("szpinak")) return 5.0;
        if (nameLower.contains("rukola")) return 6.0;

        // Owoce
        if (nameLower.contains("jabłka")) return 6.0;
        if (nameLower.contains("banany")) return 8.0;
        if (nameLower.contains("pomarańcze")) return 7.0;
        if (nameLower.contains("mandarynki")) return 9.0;
        if (nameLower.contains("winogrona")) return 12.0;
        if (nameLower.contains("truskawki")) return 15.0;
        if (nameLower.contains("maliny")) return 20.0;
        if (nameLower.contains("śliwki")) return 8.0;
        if (nameLower.contains("gruszki")) return 7.0;
        if (nameLower.contains("kiwi")) return 10.0;
        if (nameLower.contains("awokado")) return 12.0;

        // Napoje
        if (nameLower.contains("woda")) return 1.5;
        if (nameLower.contains("cola")) return 5.0;
        if (nameLower.contains("pepsi")) return 4.5;
        if (nameLower.contains("sok")) return 6.0;
        if (nameLower.contains("tonik")) return 3.0;
        if (nameLower.contains("piwo")) return 4.0;
        if (nameLower.contains("wino")) return 25.0;
        if (nameLower.contains("kawa")) return 15.0;
        if (nameLower.contains("herbata")) return 8.0;
        if (nameLower.contains("energetyk")) return 3.5;

        // Produkty sypkie
        if (nameLower.contains("mąka")) return 3.0;
        if (nameLower.contains("cukier")) return 4.0;
        if (nameLower.contains("ryż")) return 4.0;
        if (nameLower.contains("kasza")) return 3.5;
        if (nameLower.contains("makaron")) return 3.5;
        if (nameLower.contains("płatki")) return 5.0;
        if (nameLower.contains("musli")) return 8.0;

        // Domyślnie
        return 5.0;
    }

    /**
     * Określ kategorię produktu
     */
    private String determineCategory(String productName) {
        String nameLower = productName.toLowerCase();

        if (nameLower.contains("mleko") || nameLower.contains("jogurt") ||
                nameLower.contains("ser") || nameLower.contains("masło") ||
                nameLower.contains("jajka")) return "Nabiał";

        if (nameLower.contains("chleb") || nameLower.contains("bułka") ||
                nameLower.contains("rogal") || nameLower.contains("bagietka")) return "Pieczywo";

        if (nameLower.contains("kurczak") || nameLower.contains("wieprzowina") ||
                nameLower.contains("wołowina") || nameLower.contains("ryba")) return "Mięso";

        if (nameLower.contains("szynka") || nameLower.contains("kiełbasa") ||
                nameLower.contains("parówki") || nameLower.contains("wędlina")) return "Wędliny";

        if (nameLower.contains("pomidor") || nameLower.contains("ogórek") ||
                nameLower.contains("marchew") || nameLower.contains("ziemniaki")) return "Warzywa";

        if (nameLower.contains("jabłka") || nameLower.contains("banany") ||
                nameLower.contains("pomarańcze") || nameLower.contains("winogrona")) return "Owoce";

        if (nameLower.contains("woda") || nameLower.contains("sok") ||
                nameLower.contains("kawa") || nameLower.contains("herbata")) return "Napoje";

        if (nameLower.contains("mąka") || nameLower.contains("cukier") ||
                nameLower.contains("ryż") || nameLower.contains("makaron")) return "Produkty sypkie";

        return "Inne";
    }

    /**
     * Oblicz cenę w konkretnym sklepie
     */
    private double calculateStorePrice(double basePrice, String storeName) {
        double multiplier;

        // Współczynniki cen dla różnych sklepów (na podstawie rzeczywistych obserwacji)
        switch(storeName.toLowerCase()) {
            case "lidl":
                multiplier = 0.90; // Najtańszy
                break;
            case "biedronka":
                multiplier = 0.95; // Bardzo tani
                break;
            case "aldi":
                multiplier = 0.92;
                break;
            case "kaufland":
                multiplier = 0.97;
                break;
            case "tesco":
                multiplier = 1.00; // Średnia cena
                break;
            case "carrefour":
                multiplier = 1.05; // Nieco droższy
                break;
            case "auchan":
                multiplier = 1.08;
                break;
            case "żabka":
                multiplier = 1.20; // Najdroższy (convenience store)
                break;
            default:
                multiplier = 1.00;
        }

        // Losowa niewielka zmienność
        Random random = new Random(storeName.hashCode() + (int)basePrice);
        double variation = 0.95 + (random.nextDouble() * 0.10); // 0.95-1.05

        double price = basePrice * multiplier * variation;
        return Math.round(price * 100.0) / 100.0; // Zaokrąglij do groszy
    }

    /**
     * Zapisz wygenerowane ceny do bazy
     */
    private void saveGeneratedPrices(String productName, String category, Map<String, Double> prices) {
        try {
            ProductPrice productPrice = new ProductPrice(productName, category);
            productPrice.setStorePrices(prices);
            productPriceRepository.save(productPrice);
            System.out.println("Zapisano ceny do bazy dla produktu: " + productName);
        } catch (Exception e) {
            System.err.println("Błąd zapisywania cen do bazy: " + e.getMessage());
        }
    }

    /**
     * Domyślne sklepy
     */
    private List<Store> getDefaultStores() {
        List<Store> stores = new ArrayList<>();

        String[] storeNames = {"Biedronka", "Lidl", "Carrefour", "Auchan", "Żabka", "Aldi"};

        for (String name : storeNames) {
            Store store = new Store();
            store.setName(name);
            store.setActive(true);
            stores.add(store);
        }

        return stores;
    }
}