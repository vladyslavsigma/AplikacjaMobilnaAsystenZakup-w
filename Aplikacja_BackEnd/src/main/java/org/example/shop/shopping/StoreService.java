package org.example.shop.shopping;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StoreService {

    private final StoreRepository storeRepository;

    public StoreService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    public List<Store> getAllActiveStores() {
        return storeRepository.findByIsActiveTrue();
    }

    public List<Store> searchStoresByName(String name) {
        return storeRepository.findByNameContainingIgnoreCase(name);
    }

    public Store saveOrUpdateStore(Store store) {
        // Jeśli sklep ma Google Place ID, sprawdź czy już istnieje
        if (store.getGooglePlaceId() != null) {
            storeRepository.findByGooglePlaceId(store.getGooglePlaceId())
                    .ifPresent(existing -> store.setId(existing.getId()));
        }
        return storeRepository.save(store);
    }

    public List<Store> findStoresNearLocation(double lat, double lon, double radiusKm) {
        // Pobierz wszystkie aktywne sklepy
        List<Store> allStores = getAllActiveStores();

        // Filtruj po odległości
        return allStores.stream()
                .filter(Store::hasCoordinates)
                .filter(store -> {
                    double distance = calculateDistance(lat, lon,
                            store.getLatitude(), store.getLongitude());
                    store.setDistanceFromUser(distance);
                    return distance <= radiusKm;
                })
                .sorted((s1, s2) -> Double.compare(
                        s1.getDistanceFromUser(), s2.getDistanceFromUser()))
                .collect(Collectors.toList());
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Promień Ziemi w km

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    public void deactivateStore(String storeId) {
        storeRepository.findById(storeId)
                .ifPresent(store -> {
                    store.setActive(false);
                    storeRepository.save(store);
                });
    }

    public List<Store> getTopRatedStores(int limit) {
        return storeRepository.findByIsActiveTrue().stream()
                .filter(store -> store.getRating() != null)
                .sorted((s1, s2) -> Double.compare(s2.getRating(), s1.getRating()))
                .limit(limit)
                .collect(Collectors.toList());
    }
}