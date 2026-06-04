// DataInitializer.java
package org.example.shop.config;

import org.example.shop.shopping.ProductPriceRepository;
import org.example.shop.shopping.Store;
import org.example.shop.shopping.StoreRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class DataInitializer implements CommandLineRunner {

    private final ProductPriceRepository productPriceRepository;
    private final StoreRepository storeRepository;

    public DataInitializer(ProductPriceRepository productPriceRepository,
                           StoreRepository storeRepository) {
        this.productPriceRepository = productPriceRepository;
        this.storeRepository = storeRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        initStores();
        initProductPrices();
    }

    private void initStores() {
        if (storeRepository.count() == 0) {
            List<Store> stores = Arrays.asList(
                    createStore("1", "Biedronka", "ul. Piotrkowska 193, Łódź", 51.7569, 19.4689, 4.2),
                    createStore("2", "Lidl", "ul. Pabianicka 245, Łódź", 51.7234, 19.5032, 4.4),
                    createStore("3", "Carrefour", "al. Piłsudskiego 22, Łódź", 51.7612, 19.4608, 4.0),
                    createStore("4", "Auchan", "ul. Rzgowska 247/249, Łódź", 51.7392, 19.5078, 4.2),
                    createStore("5", "Żabka", "ul. Piotrkowska 217, Łódź", 51.7555, 19.4705, 3.9),
                    createStore("6", "Aldi", "ul. Włókniarzy 25, Łódź", 51.7500, 19.4800, 4.1),
                    createStore("7", "Kaufland", "ul. Strykowska 30, Łódź", 51.7700, 19.4900, 4.3),
                    createStore("8", "Tesco", "ul. Łąkowa 12, Łódź", 51.7400, 19.5100, 4.0)
            );

            storeRepository.saveAll(stores);
            System.out.println("Zainicjalizowano " + stores.size() + " sklepów");
        }
    }

    private void initProductPrices() {
        if (productPriceRepository.count() == 0) {
            // Użyj przykładowych danych z PriceDataController
            // (lub wywołaj endpoint /api/prices/init-sample-data po starcie)
            System.out.println("Brak danych cenowych. Wywołaj POST /api/prices/init-sample-data");
        }
    }

    private Store createStore(String id, String name, String address,
                              double lat, double lon, double rating) {
        Store store = new Store();
        store.setId(id);
        store.setName(name);
        store.setAddress(address);
        store.setLatitude(lat);
        store.setLongitude(lon);
        store.setRating(rating);
        store.setActive(true);
        store.setPhoneNumber("+48 42 000 00 00");
        return store;
    }
}