package org.example.shop.shopping;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;
import java.util.Optional;

public interface StoreRepository extends MongoRepository<Store, String> {

    // Znajdź wszystkie aktywne sklepy
    List<Store> findByIsActiveTrue();

    // Znajdź sklepy po nazwie (case insensitive)
    List<Store> findByNameContainingIgnoreCase(String name);

    // Znajdź sklepy z koordynatami
    @Query("{ 'latitude': { $ne: null }, 'longitude': { $ne: null } }")
    List<Store> findStoresWithCoordinates();

    // Znajdź sklepy w pobliżu lokalizacji (przybliżone)
    @Query("{ 'latitude': { $gte: ?0, $lte: ?1 }, 'longitude': { $gte: ?2, $lte: ?3 } }")
    List<Store> findStoresInBoundingBox(double minLat, double maxLat, double minLon, double maxLon);

    // Znajdź sklep po Google Place ID
    Optional<Store> findByGooglePlaceId(String googlePlaceId);

    // Znajdź sklepy z oceną powyżej wartości
    List<Store> findByRatingGreaterThanEqual(Double minRating);

    // Znajdź sklepy po typie (przykład z custom query)
    @Query("{ 'name': { $regex: ?0, $options: 'i' } }")
    List<Store> findStoresByType(String typeRegex);
}