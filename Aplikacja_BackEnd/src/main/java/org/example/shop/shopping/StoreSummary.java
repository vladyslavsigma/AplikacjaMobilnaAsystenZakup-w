package org.example.shop.shopping;

import java.util.HashMap;
import java.util.Map;

public class StoreSummary {

    private Map<String, Double> storeTotals = new HashMap<>();
    private String bestStore;
    private double bestPrice;

    public StoreSummary() {}

    public void addStoreTotal(String store, double total) {
        storeTotals.put(store, total);
    }

    public void calculateBest() {
        bestStore = null;
        bestPrice = Double.MAX_VALUE;

        for (Map.Entry<String, Double> entry : storeTotals.entrySet()) {
            if (entry.getValue() < bestPrice && entry.getValue() > 0) {
                bestPrice = entry.getValue();
                bestStore = entry.getKey();
            }
        }

        if (bestStore == null && !storeTotals.isEmpty()) {
            // Jeśli wszystkie są 0, weź pierwszy
            bestStore = storeTotals.keySet().iterator().next();
            bestPrice = 0.0;
        }
    }

    // Gettery
    public Map<String, Double> getStoreTotals() { return storeTotals; }
    public String getBestStore() { return bestStore; }
    public double getBestPrice() { return bestPrice; }
}