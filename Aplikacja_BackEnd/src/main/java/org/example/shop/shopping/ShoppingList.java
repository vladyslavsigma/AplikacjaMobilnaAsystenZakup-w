package org.example.shop.shopping;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "shopping_lists")
public class ShoppingList {

    @Id
    private String id;
    private String userId;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private List<ShoppingItem> items = new ArrayList<>();

    // Konstruktory, gettery, settery
    public ShoppingList() {
        this.createdAt = LocalDateTime.now();
    }

    public ShoppingList(String userId, String name, String description) {
        this();
        this.userId = userId;
        this.name = name;
        this.description = description;
    }

    // Gettery i settery
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<ShoppingItem> getItems() { return items; }
    public void setItems(List<ShoppingItem> items) { this.items = items; }

    public void addItem(ShoppingItem item) {
        this.items.add(item);
    }

    public void removeItem(String itemId) {
        this.items.removeIf(item -> item.getId().equals(itemId));
    }
}