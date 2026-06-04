package org.example.shop.maps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.*;

@Service
public class OpenStreetMapService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public OpenStreetMapService() {
        this.webClient = WebClient.builder()
                .baseUrl("https://overpass-api.de/api/interpreter")
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Wyszukuje sklepy w promieniu z OpenStreetMap
     */
    public List<Map<String, Object>> findStoresInRadius(double lat, double lon, double radiusKm, String storeType) {
        try {
            String overpassQuery = buildOverpassQuery(lat, lon, radiusKm * 1000, storeType);

            String response = webClient.post()
                    .bodyValue(overpassQuery)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return parseOverpassResponse(response);

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    /**
     * Buduje zapytanie Overpass QL
     */
    private String buildOverpassQuery(double lat, double lon, double radiusMeters, String storeType) {
        String storeFilter = "";

        if ("supermarket".equalsIgnoreCase(storeType)) {
            storeFilter = "[\"shop\"=\"supermarket\"]";
        } else if ("convenience".equalsIgnoreCase(storeType)) {
            storeFilter = "[\"shop\"=\"convenience\"]";
        } else if ("all".equalsIgnoreCase(storeType)) {
            storeFilter = "[\"shop\"~\"supermarket|convenience|department_store|mall\"]";
        } else {
            // Domyślnie szukaj supermarketów
            storeFilter = "[\"shop\"=\"supermarket\"]";
        }

        return String.format(
                "[out:json][timeout:30];" +
                        "(" +
                        "  node%s(around:%f,%f,%f);" +
                        "  way%s(around:%f,%f,%f);" +
                        "  relation%s(around:%f,%f,%f);" +
                        ");" +
                        "out center;" +
                        ">;" +
                        "out skel;",
                storeFilter, radiusMeters, lat, lon,
                storeFilter, radiusMeters, lat, lon,
                storeFilter, radiusMeters, lat, lon
        );
    }

    /**
     * Parsuje odpowiedź z Overpass API
     */
    private List<Map<String, Object>> parseOverpassResponse(String response) throws Exception {
        List<Map<String, Object>> stores = new ArrayList<>();

        JsonNode root = objectMapper.readTree(response);
        JsonNode elements = root.get("elements");

        if (elements == null || !elements.isArray()) {
            return stores;
        }

        for (JsonNode element : elements) {
            if ("node".equals(element.get("type").asText()) ||
                    "way".equals(element.get("type").asText()) ||
                    "relation".equals(element.get("type").asText())) {

                Map<String, Object> store = new HashMap<>();
                JsonNode tags = element.get("tags");

                if (tags == null) continue;

                // Pobierz nazwę
                String name = tags.has("name") ? tags.get("name").asText() : "Nieznany sklep";
                store.put("name", name);

                // Pobierz adres
                if (tags.has("addr:street") && tags.has("addr:housenumber")) {
                    String address = tags.get("addr:street").asText() + " " +
                            tags.get("addr:housenumber").asText();
                    if (tags.has("addr:city")) {
                        address += ", " + tags.get("addr:city").asText();
                    }
                    store.put("address", address);
                } else {
                    store.put("address", "Adres nieznany");
                }

                // Pobierz koordynaty
                if (element.has("lat") && element.has("lon")) {
                    store.put("latitude", element.get("lat").asDouble());
                    store.put("longitude", element.get("lon").asDouble());
                } else if (element.has("center")) {
                    store.put("latitude", element.get("center").get("lat").asDouble());
                    store.put("longitude", element.get("center").get("lon").asDouble());
                }

                // Dodaj typ sklepu
                if (tags.has("shop")) {
                    store.put("type", tags.get("shop").asText());
                }

                // Dodaj website jeśli istnieje
                if (tags.has("website")) {
                    store.put("website", tags.get("website").asText());
                }

                // Dodaj phone jeśli istnieje
                if (tags.has("phone")) {
                    store.put("phoneNumber", tags.get("phone").asText());
                }

                // Generuj ID
                store.put("id", "osm_" + element.get("id").asText());
                store.put("isActive", true);
                store.put("rating", 4.0); // Domyślna ocena

                stores.add(store);
            }
        }

        return stores;
    }

    /**
     * Alternatywna metoda używająca Nominatim API (prostsza, ale mniej danych)
     */
    public List<Map<String, Object>> findStoresNominatim(double lat, double lon, double radiusKm, String query) {
        try {
            String url = String.format(
                    "https://nominatim.openstreetmap.org/search?" +
                            "q=%s&" +
                            "format=json&" +
                            "lat=%f&lon=%f&" +
                            "radius=%f&" +
                            "limit=20",
                    query, lat, lon, radiusKm * 1000
            );

            String response = WebClient.create()
                    .get()
                    .uri(url)
                    .header("User-Agent", "ShoppingApp/1.0 (contact@example.com)")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            return parseNominatimResponse(response);

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    private List<Map<String, Object>> parseNominatimResponse(String response) throws Exception {
        List<Map<String, Object>> stores = new ArrayList<>();

        JsonNode results = objectMapper.readTree(response);

        if (!results.isArray()) {
            return stores;
        }

        for (JsonNode result : results) {
            Map<String, Object> store = new HashMap<>();

            store.put("name", result.has("display_name") ?
                    result.get("display_name").asText().split(",")[0] : "Nieznany sklep");
            store.put("address", result.has("display_name") ?
                    result.get("display_name").asText() : "Adres nieznany");
            store.put("latitude", result.get("lat").asDouble());
            store.put("longitude", result.get("lon").asDouble());
            store.put("id", "nom_" + result.get("place_id").asText());
            store.put("isActive", true);
            store.put("rating", 4.0);
            store.put("type", result.has("type") ? result.get("type").asText() : "shop");

            stores.add(store);
        }

        return stores;
    }
}