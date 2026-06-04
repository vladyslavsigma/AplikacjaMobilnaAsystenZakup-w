package org.example.shop.shopping;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shopping")
@CrossOrigin("*")
public class ShoppingController {

    private final ShoppingService shoppingService;
    private final StoreRepository storeRepository; // Dodaj tę zależność

    public ShoppingController(ShoppingService shoppingService,
                              StoreRepository storeRepository) { // Dodaj do konstruktora
        this.shoppingService = shoppingService;
        this.storeRepository = storeRepository;
    }

    // Pobierz listy użytkownika
    @GetMapping("/lists")
    public ResponseEntity<List<ShoppingList>> getUserLists(@RequestParam String userId) {
        List<ShoppingList> lists = shoppingService.getUserLists(userId);
        return ResponseEntity.ok(lists);
    }

    // Utwórz nową listę
    @PostMapping("/lists")
    public ResponseEntity<ShoppingList> createList(
            @RequestParam String userId,
            @RequestBody ShoppingListRequest request) {
        ShoppingList list = shoppingService.createList(userId, request);
        return ResponseEntity.ok(list);
    }

    // Aktualizuj produkt (ilość, nazwę, kategorię, jednostkę, uwagi)
    @PutMapping("/lists/{listId}/items/{itemId}")
    public ResponseEntity<ShoppingList> updateItem(
            @RequestParam String userId,
            @PathVariable String listId,
            @PathVariable String itemId,
            @RequestBody ShoppingItem updatedItem) {
        ShoppingList updatedList = shoppingService.updateItem(userId, listId, itemId, updatedItem);
        return updatedList != null ?
                ResponseEntity.ok(updatedList) :
                ResponseEntity.notFound().build();
    }

    // Aktualizuj tylko ilość produktu
    @PutMapping("/lists/{listId}/items/{itemId}/quantity")
    public ResponseEntity<ShoppingList> updateItemQuantity(
            @RequestParam String userId,
            @PathVariable String listId,
            @PathVariable String itemId,
            @RequestBody Map<String, Integer> request) {
        Integer newQuantity = request.get("quantity");
        if (newQuantity == null || newQuantity < 1) {
            return ResponseEntity.badRequest().build();
        }

        ShoppingList updatedList = shoppingService.updateItemQuantity(userId, listId, itemId, newQuantity);
        return updatedList != null ?
                ResponseEntity.ok(updatedList) :
                ResponseEntity.notFound().build();
    }

    // Pobierz konkretną listę
    @GetMapping("/lists/{listId}")
    public ResponseEntity<ShoppingList> getList(
            @RequestParam String userId,
            @PathVariable String listId) {
        return shoppingService.getList(userId, listId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Usuń listę
    @DeleteMapping("/lists/{listId}")
    public ResponseEntity<Void> deleteList(
            @RequestParam String userId,
            @PathVariable String listId) {
        shoppingService.deleteList(userId, listId);
        return ResponseEntity.ok().build();
    }

    // Dodaj produkt do listy
    @PostMapping("/lists/{listId}/items")
    public ResponseEntity<ShoppingList> addItem(
            @RequestParam String userId,
            @PathVariable String listId,
            @RequestBody ShoppingItemRequest request) {
        ShoppingList updatedList = shoppingService.addItemToList(userId, listId, request);
        return updatedList != null ?
                ResponseEntity.ok(updatedList) :
                ResponseEntity.notFound().build();
    }

    // Aktualizuj cenę produktu w sklepie
    @PutMapping("/lists/{listId}/items/{itemId}/price")
    public ResponseEntity<ShoppingList> updateItemPrice(
            @RequestParam String userId,
            @PathVariable String listId,
            @PathVariable String itemId,
            @RequestBody PriceUpdateRequest request) {
        ShoppingList updatedList = shoppingService.updateItemPrice(
                userId, listId, itemId, request.getStore(), request.getPrice());
        return updatedList != null ?
                ResponseEntity.ok(updatedList) :
                ResponseEntity.notFound().build();
    }

    // Usuń produkt z listy
    @DeleteMapping("/lists/{listId}/items/{itemId}")
    public ResponseEntity<ShoppingList> removeItem(
            @RequestParam String userId,
            @PathVariable String listId,
            @PathVariable String itemId) {
        ShoppingList updatedList = shoppingService.removeItem(userId, listId, itemId);
        return updatedList != null ?
                ResponseEntity.ok(updatedList) :
                ResponseEntity.notFound().build();
    }

    // Oblicz najlepszy sklep dla listy
    @GetMapping("/lists/{listId}/best-store")
    public ResponseEntity<StoreSummary> getBestStore(
            @RequestParam String userId,
            @PathVariable String listId) {
        return shoppingService.getList(userId, listId)
                .map(list -> {
                    StoreSummary summary = shoppingService.calculateBestStore(list);
                    return ResponseEntity.ok(summary);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Dodaj tę metodę do istniejącego ShoppingController
    @GetMapping("/lists/{listId}/stores-map")
    public ResponseEntity<?> getStoresMapForList(
            @RequestParam String userId,
            @PathVariable String listId,
            @RequestParam(required = false) String userAddress) {

        return shoppingService.getList(userId, listId)
                .map(list -> {
                    // Pobierz wszystkie aktywne sklepy
                    List<Store> allStores = storeRepository.findByIsActiveTrue();

                    // Tutaj możesz dodać logikę filtrowania sklepów
                    // na podstawie produktów w liście lub lokalizacji użytkownika

                    Map<String, Object> result = new HashMap<>();
                    result.put("list", list);
                    result.put("stores", allStores);
                    result.put("recommendedStores", recommendStoresForList(list, allStores));

                    return ResponseEntity.ok(result);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private List<Store> recommendStoresForList(ShoppingList list, List<Store> allStores) {
        // Prosta logika rekomendacji na podstawie produktów
        // W rzeczywistej aplikacji byłoby to bardziej zaawansowane

        return allStores.stream()
                .filter(store -> store.getRating() != null && store.getRating() >= 4.0)
                .limit(5)
                .collect(Collectors.toList());
    }
}