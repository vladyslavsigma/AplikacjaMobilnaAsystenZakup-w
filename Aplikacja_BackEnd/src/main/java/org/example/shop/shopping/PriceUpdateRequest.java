package org.example.shop.shopping;

public class PriceUpdateRequest {
    private String store;
    private double price;

    // Gettery i settery
    public String getStore() { return store; }
    public void setStore(String store) { this.store = store; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
}