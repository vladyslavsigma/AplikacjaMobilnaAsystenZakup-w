package org.example.shop.shopping;

import java.util.HashMap;
import java.util.Map;

public class PriceComparison {

    private Map<String, Double> storePrices = new HashMap<>(); // StoreName -> Price
    private String cheapestStore;
    private Double cheapestPrice;

    public PriceComparison() {}

    // Gettery i settery
    public Map<String, Double> getStorePrices() { return storePrices; }
    public void setStorePrices(Map<String, Double> storePrices) {
        this.storePrices = storePrices;
        calculateCheapest();
    }

    public String getCheapestStore() { return cheapestStore; }
    public void setCheapestStore(String cheapestStore) { this.cheapestStore = cheapestStore; }

    public Double getCheapestPrice() { return cheapestPrice; }
    public void setCheapestPrice(Double cheapestPrice) { this.cheapestPrice = cheapestPrice; }

    // Metody pomocnicze
    public void addStorePrice(String store, Double price) {
        this.storePrices.put(store, price);
        calculateCheapest();
    }

    private void calculateCheapest() {
        if (storePrices.isEmpty()) {
            cheapestStore = null;
            cheapestPrice = null;
            return;
        }

        cheapestStore = null;
        cheapestPrice = Double.MAX_VALUE;

        for (Map.Entry<String, Double> entry : storePrices.entrySet()) {
            if (entry.getValue() < cheapestPrice) {
                cheapestPrice = entry.getValue();
                cheapestStore = entry.getKey();
            }
        }
    }

    public Double getTotalForStore(String store, int quantity) {
        Double price = storePrices.get(store);
        return price != null ? price * quantity : null;
    }
}