package org.example.shop.maps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class GoogleMapsService {

    // USUŃ lub ZAKOMENTUJ @Value - używamy OpenStreetMap zamiast Google Maps
    // @Value("${google.api.key}")
    // private String apiKey;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public GoogleMapsService() {
        // Zmień na OpenStreetMap Nominatim API (darmowe)
        this.webClient = WebClient.builder()
                .baseUrl("https://nominatim.openstreetmap.org")
                .defaultHeader("User-Agent", "ShoppingApp/1.0") // Wymagane przez OSM
                .build();
        this.objectMapper = new ObjectMapper();
    }

    // GETTER dla apiKey - zwróć pusty string
    public String getApiKey() {
        return ""; // OpenStreetMap nie wymaga klucza
    }

    @Cacheable(value = "storeLocations", unless = "#result == null")
    public Map<String, Object> findStoresNearby(StoreLocationRequest request) {
        try {
            String location = "";
            if (request.getLatitude() != null && request.getLongitude() != null) {
                location = request.getLatitude() + "," + request.getLongitude();
            } else if (request.getAddress() != null && !request.getAddress().isEmpty()) {
                location = geocodeAddress(request.getAddress());
            }

            if (location.isEmpty()) {
                throw new IllegalArgumentException("Brak lokalizacji do wyszukiwania");
            }

            String[] coords = location.split(",");
            double lat = Double.parseDouble(coords[0]);
            double lon = Double.parseDouble(coords[1]);

            String query = request.getStoreName() != null ?
                    request.getStoreName() :
                    (request.getType() != null ? request.getType() : "supermarket");

            int radius = request.getRadius() != null ? request.getRadius() : 5000;

            // OpenStreetMap Nominatim API (darmowe)
            String url = String.format("/search?format=json&q=%s&lat=%f&lon=%f&radius=%d&limit=10",
                    URLEncoder.encode(query, StandardCharsets.UTF_8),
                    lat, lon, radius);

            String response = webClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode results = objectMapper.readTree(response);
            List<Map<String, Object>> stores = new ArrayList<>();

            if (results.isArray()) {
                for (JsonNode result : results) {
                    Map<String, Object> store = new HashMap<>();
                    store.put("name", result.get("display_name").asText().split(",")[0]);
                    store.put("address", result.get("display_name").asText());
                    store.put("latitude", Double.parseDouble(result.get("lat").asText()));
                    store.put("longitude", Double.parseDouble(result.get("lon").asText()));
                    store.put("type", result.get("type").asText());
                    stores.add(store);
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("stores", stores);
            result.put("count", stores.size());
            result.put("status", "OK");

            return result;

        } catch (Exception e) {
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("error", e.getMessage());
            errorResult.put("stores", Collections.emptyList());
            errorResult.put("count", 0);
            return errorResult;
        }
    }

    private String geocodeAddress(String address) {
        try {
            String url = String.format("/search?format=json&q=%s&limit=1",
                    URLEncoder.encode(address, StandardCharsets.UTF_8));

            String response = webClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode results = objectMapper.readTree(response);

            if (results.isArray() && results.size() > 0) {
                JsonNode firstResult = results.get(0);
                return firstResult.get("lat").asText() + "," + firstResult.get("lon").asText();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return "";
    }

    public String getStaticMapUrl(Double lat, Double lng, Integer zoom, String storeName) {
        if (lat == null || lng == null) {
            return "";
        }

        // OpenStreetMap static map (darmowe)
        int z = zoom != null ? zoom : 14;
        int x = (int) ((lng + 180) / 360 * Math.pow(2, z));
        int y = (int) ((1 - Math.log(Math.tan(Math.toRadians(lat)) + 1 / Math.cos(Math.toRadians(lat))) / Math.PI) / 2 * Math.pow(2, z));

        return String.format("https://tile.openstreetmap.org/%d/%d/%d.png", z, x, y);
    }
}