package org.example.shop.shopping;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface ProductPriceRepository extends MongoRepository<ProductPrice, String> {
    Optional<ProductPrice> findByProductNameIgnoreCase(String productName);
    List<ProductPrice> findByCategoryIgnoreCase(String category);
    List<ProductPrice> findByProductNameContainingIgnoreCase(String productName);
}