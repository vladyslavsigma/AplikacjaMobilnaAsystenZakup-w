package org.example.shop.shopping;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ShoppingListRepository extends MongoRepository<ShoppingList, String> {
    List<ShoppingList> findByUserId(String userId);
    void deleteByUserIdAndId(String userId, String id);
}