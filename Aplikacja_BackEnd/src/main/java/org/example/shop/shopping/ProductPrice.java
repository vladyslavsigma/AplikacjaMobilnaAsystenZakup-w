// ProductPrice.java
package org.example.shop.shopping;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Document(collection = "product_prices")
public class ProductPrice {
    @Id
    private String id;
    private String productName;
    private String category;
    private Map<String, Double> storePrices = new HashMap<>(); // StoreName -> Price
    private LocalDateTime lastUpdated;

    // Konstruktor, gettery, settery
    public ProductPrice() {}

    public ProductPrice(String productName, String category) {
        this.productName = productName;
        this.category = category;
        this.lastUpdated = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Map<String, Double> getStorePrices() { return storePrices; }
    public void setStorePrices(Map<String, Double> storePrices) {
        this.storePrices = storePrices;
        this.lastUpdated = LocalDateTime.now();
    }
    public LocalDateTime getLastUpdated() { return lastUpdated; }

    public void addStorePrice(String store, Double price) {
        this.storePrices.put(store, price);
        this.lastUpdated = LocalDateTime.now();
    }

    public Double getPriceForStore(String store) {
        return storePrices.get(store);
    }
}