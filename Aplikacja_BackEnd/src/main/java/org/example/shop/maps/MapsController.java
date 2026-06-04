package org.example.shop.maps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.shop.shopping.Store;
import org.example.shop.shopping.StoreRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/maps")
@CrossOrigin("*")
public class MapsController {

    private final StoreRepository storeRepository;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public MapsController(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
        this.webClient = WebClient.builder()
                .baseUrl("https://nominatim.openstreetmap.org")
                .defaultHeader("User-Agent", "ShoppingApp/1.0")
                .build();
        this.objectMapper = new ObjectMapper();
    }

    @PostMapping("/stores/in-radius")
    public ResponseEntity<?> findStoresInRadius(@RequestBody RadiusSearchRequest request) {
        try {
            System.out.println("Szukanie sklepów w promieniu " + request.getRadiusKm() + " km od: " +
                    request.getLatitude() + ", " + request.getLongitude());

            List<Store> allStores = storeRepository.findByIsActiveTrue();
            List<Store> storesInRadius = filterStoresByDistance(allStores,
                    request.getLatitude(), request.getLongitude(), request.getRadiusKm());

            // Sortuj po odległości i ustaw odległość dla każdego sklepu
            storesInRadius.sort((s1, s2) -> {
                double d1 = calculateDistance(request.getLatitude(), request.getLongitude(),
                        s1.getLatitude(), s1.getLongitude());
                double d2 = calculateDistance(request.getLatitude(), request.getLongitude(),
                        s2.getLatitude(), s2.getLongitude());
                s1.setDistanceFromUser(d1);
                s2.setDistanceFromUser(d2);
                return Double.compare(d1, d2);
            });

            Map<String, Object> response = new HashMap<>();
            response.put("stores", storesInRadius);
            response.put("count", storesInRadius.size());
            response.put("center", Map.of(
                    "latitude", request.getLatitude(),
                    "longitude", request.getLongitude()
            ));
            response.put("radiusKm", request.getRadiusKm());
            response.put("message", "Znaleziono " + storesInRadius.size() +
                    " sklepów w promieniu " + request.getRadiusKm() + " km");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getMessage(),
                    "stores", List.of(),
                    "count", 0
            ));
        }
    }

    @PostMapping("/search-osm")
    public ResponseEntity<?> searchOsmStores(@RequestBody SimpleSearchRequest request) {
        try {
            System.out.println("Wyszukiwanie sklepów OSM: " + request);

            // Szukaj w OpenStreetMap Nominatim
            List<Map<String, Object>> stores = findStoresInOpenStreetMap(
                    request.getLatitude(),
                    request.getLongitude(),
                    request.getRadiusKm(),
                    request.getQuery()
            );

            // Dodaj odległości
            for (Map<String, Object> store : stores) {
                double lat = (Double) store.get("latitude");
                double lon = (Double) store.get("longitude");
                double distance = calculateDistance(request.getLatitude(), request.getLongitude(), lat, lon);
                store.put("distanceFromUser", distance);

                // Format odległości
                String formattedDistance;
                if (distance < 1) {
                    formattedDistance = Math.round(distance * 1000) + " m";
                } else {
                    formattedDistance = String.format("%.1f km", distance);
                }
                store.put("formattedDistance", formattedDistance);

                // Dodaj ocenę jeśli brak
                if (!store.containsKey("rating")) {
                    store.put("rating", 4.0);
                }
            }

            // Sortuj po odległości
            stores.sort((s1, s2) -> {
                double d1 = (Double) s1.get("distanceFromUser");
                double d2 = (Double) s2.get("distanceFromUser");
                return Double.compare(d1, d2);
            });

            Map<String, Object> response = new HashMap<>();
            response.put("stores", stores);
            response.put("count", stores.size());
            response.put("center", Map.of(
                    "latitude", request.getLatitude(),
                    "longitude", request.getLongitude()
            ));
            response.put("radiusKm", request.getRadiusKm());
            response.put("message", "Znaleziono " + stores.size() + " sklepów w OpenStreetMap");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            // Zwróć przykładowe dane dla testów
            List<Map<String, Object>> sampleStores = getSampleOsmStores(
                    request.getLatitude(),
                    request.getLongitude(),
                    request.getRadiusKm()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("stores", sampleStores);
            response.put("count", sampleStores.size());
            response.put("center", Map.of(
                    "latitude", request.getLatitude(),
                    "longitude", request.getLongitude()
            ));
            response.put("radiusKm", request.getRadiusKm());
            response.put("message", "Używam przykładowych danych. " + sampleStores.size() + " sklepów");
            response.put("warning", "OpenStreetMap API nie odpowiada, używam danych testowych");

            return ResponseEntity.ok(response);
        }
    }

    private List<Map<String, Object>> findStoresInOpenStreetMap(double lat, double lon, double radiusKm, String query) {
        try {
            String url = String.format(
                    "/search?format=json&q=%s&lat=%f&lon=%f&radius=%f&limit=20&addressdetails=1",
                    query, lat, lon, radiusKm * 1000
            );

            String response = webClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return parseNominatimResponse(response, lat, lon);

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Błąd podczas wyszukiwania w OpenStreetMap: " + e.getMessage());
        }
    }

    private List<Map<String, Object>> parseNominatimResponse(String response, double centerLat, double centerLon) throws Exception {
        List<Map<String, Object>> stores = new ArrayList<>();

        JsonNode results = objectMapper.readTree(response);

        if (!results.isArray()) {
            return stores;
        }

        for (JsonNode result : results) {
            Map<String, Object> store = new HashMap<>();

            // Pobierz nazwę
            String displayName = result.has("display_name") ? result.get("display_name").asText() : "";
            String name = displayName.split(",")[0].trim();
            store.put("name", name.isEmpty() ? "Nieznany sklep" : name);

            // Pobierz adres
            String address = displayName;
            if (result.has("address")) {
                JsonNode addressNode = result.get("address");
                StringBuilder addrBuilder = new StringBuilder();

                if (addressNode.has("road")) {
                    addrBuilder.append(addressNode.get("road").asText());
                }
                if (addressNode.has("house_number")) {
                    addrBuilder.append(" ").append(addressNode.get("house_number").asText());
                }
                if (addrBuilder.length() > 0 && addressNode.has("city")) {
                    addrBuilder.append(", ").append(addressNode.get("city").asText());
                }

                if (addrBuilder.length() > 0) {
                    address = addrBuilder.toString();
                }
            }
            store.put("address", address);

            // Pobierz koordynaty
            store.put("latitude", Double.parseDouble(result.get("lat").asText()));
            store.put("longitude", Double.parseDouble(result.get("lon").asText()));

            // Generuj ID
            store.put("id", "osm_" + result.get("place_id").asText());
            store.put("isActive", true);

            // Określ typ
            String type = result.has("type") ? result.get("type").asText() : "shop";
            store.put("type", type);

            // Dodaj kategorię
            String category = result.has("category") ? result.get("category").asText() : "supermarket";
            store.put("category", category);

            stores.add(store);
        }

        return stores;
    }

    private List<Map<String, Object>> getSampleOsmStores(double centerLat, double centerLon, double radiusKm) {
        List<Map<String, Object>> stores = new ArrayList<>();

        // Generuj przykładowe sklepy wokół centrum
        String[] shopNames = {"Biedronka", "Lidl", "Carrefour", "Żabka", "Aldi", "Kaufland", "Tesco", "Stokrotka"};

        Random random = new Random();
        int numStores = 5 + random.nextInt(10); // 5-15 sklepów

        for (int i = 0; i < numStores; i++) {
            Map<String, Object> store = new HashMap<>();

            // Losowa odległość w promieniu
            double distance = random.nextDouble() * radiusKm;
            double angle = random.nextDouble() * 2 * Math.PI;

            // Przelicz na koordynaty
            double lat = centerLat + (distance / 111.32) * Math.cos(angle);
            double lon = centerLon + (distance / (111.32 * Math.cos(Math.toRadians(centerLat)))) * Math.sin(angle);

            String shopName = shopNames[random.nextInt(shopNames.length)];

            store.put("id", "osm_sample_" + i);
            store.put("name", shopName + " (przykładowy)");
            store.put("address", "ul. Przykładowa " + (i+1) + ", Łódź");
            store.put("latitude", lat);
            store.put("longitude", lon);
            store.put("distanceFromUser", distance);
            store.put("formattedDistance", String.format("%.1f km", distance));
            store.put("rating", 3.5 + random.nextDouble() * 1.5); // 3.5-5.0
            store.put("isActive", true);
            store.put("type", "supermarket");
            store.put("category", "shop");

            stores.add(store);
        }

        return stores;
    }

    @GetMapping("/store-locations")
    public ResponseEntity<?> getAllStoreLocations() {
        try {
            List<Store> stores = storeRepository.findByIsActiveTrue();

            // Jeśli baza jest pusta, zwróć przykładowe sklepy Łodzi
            if (stores.isEmpty()) {
                stores = getSampleLodzStores();
                System.out.println("Baza danych pusta, zwracam przykładowe sklepy Łodzi: " + stores.size());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("stores", stores);
            response.put("count", stores.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            // W przypadku błędu, zwróć przykładowe dane
            List<Store> sampleStores = getSampleLodzStores();
            Map<String, Object> response = new HashMap<>();
            response.put("stores", sampleStores);
            response.put("count", sampleStores.size());
            response.put("warning", "Błąd pobierania z bazy, używam danych testowych");
            return ResponseEntity.ok(response);
        }
    }

    private List<Store> getSampleLodzStores() {
        List<Store> stores = new ArrayList<>();

        // Przykładowe sklepy w Łodzi
        Store store1 = new Store();
        store1.setId("1");
        store1.setName("Biedronka");
        store1.setAddress("ul. Piotrkowska 193, 90-447 Łódź");
        store1.setLatitude(51.7569);
        store1.setLongitude(19.4689);
        store1.setRating(4.2);
        store1.setPhoneNumber("+48 42 630 15 67");
        store1.setActive(true);

        Store store2 = new Store();
        store2.setId("2");
        store2.setName("Lidl");
        store2.setAddress("ul. Pabianicka 245, 93-457 Łódź");
        store2.setLatitude(51.7234);
        store2.setLongitude(19.5032);
        store2.setRating(4.4);
        store2.setPhoneNumber("+48 42 675 43 21");
        store2.setActive(true);

        Store store3 = new Store();
        store3.setId("3");
        store3.setName("Carrefour");
        store3.setAddress("al. Piłsudskiego 22, 90-368 Łódź");
        store3.setLatitude(51.7612);
        store3.setLongitude(19.4608);
        store3.setRating(4.0);
        store3.setPhoneNumber("+48 42 631 45 67");
        store3.setActive(true);

        Store store4 = new Store();
        store4.setId("4");
        store4.setName("Auchan");
        store4.setAddress("ul. Rzgowska 247/249, 93-021 Łódź");
        store4.setLatitude(51.7392);
        store4.setLongitude(19.5078);
        store4.setRating(4.2);
        store4.setPhoneNumber("+48 42 675 55 55");
        store4.setActive(true);

        Store store5 = new Store();
        store5.setId("5");
        store5.setName("Żabka");
        store5.setAddress("ul. Piotrkowska 217, 90-950 Łódź");
        store5.setLatitude(51.7555);
        store5.setLongitude(19.4705);
        store5.setRating(3.9);
        store5.setPhoneNumber("+48 42 630 55 66");
        store5.setActive(true);

        stores.add(store1);
        stores.add(store2);
        stores.add(store3);
        stores.add(store4);
        stores.add(store5);

        return stores;
    }

    private List<Store> filterStoresByDistance(List<Store> stores, double centerLat,
                                               double centerLon, double radiusKm) {
        if (centerLat == 0 && centerLon == 0) {
            return stores; // Zwróć wszystkie jeśli nie ustawiono centrum
        }

        return stores.stream()
                .filter(store -> store.getLatitude() != null && store.getLongitude() != null)
                .filter(store -> {
                    double distance = calculateDistance(centerLat, centerLon,
                            store.getLatitude(), store.getLongitude());
                    store.setDistanceFromUser(distance);
                    return distance <= radiusKm;
                })
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

        return R * c; // Odległość w km
    }
}


// DTO dla wyszukiwania OSM
class SimpleSearchRequest {
    private Double latitude;
    private Double longitude;
    private Double radiusKm = 5.0;
    private String query = "supermarket";
    private String method = "nominatim";

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getRadiusKm() { return radiusKm; }
    public void setRadiusKm(Double radiusKm) { this.radiusKm = radiusKm; }

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    @Override
    public String toString() {
        return "SimpleSearchRequest{" +
                "latitude=" + latitude +
                ", longitude=" + longitude +
                ", radiusKm=" + radiusKm +
                ", query='" + query + '\'' +
                ", method='" + method + '\'' +
                '}';
    }
}