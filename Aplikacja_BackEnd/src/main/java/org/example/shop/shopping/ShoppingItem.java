package org.example.shop.shopping;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.UUID;

public class ShoppingItem {

    @Id
    private String id;
    private String name;
    private String category;
    private int quantity;
    private String unit; // szt, kg, litr, etc.
    private String notes;

    // Ceny w różnych sklepach
    private PriceComparison priceComparison = new PriceComparison();

    // Konstruktory
    public ShoppingItem() {
        this.id = UUID.randomUUID().toString(); // Automatyczne generowanie ID
    }

    public ShoppingItem(String name, int quantity, String unit) {
        this();
        this.name = name;
        this.quantity = quantity;
        this.unit = unit;
    }

    // Gettery i settery
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public PriceComparison getPriceComparison() { return priceComparison; }
    public void setPriceComparison(PriceComparison priceComparison) {
        this.priceComparison = priceComparison;
    }
}