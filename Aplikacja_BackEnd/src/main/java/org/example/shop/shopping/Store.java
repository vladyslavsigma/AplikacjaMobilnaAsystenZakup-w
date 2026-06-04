package org.example.shop.shopping;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "stores")
public class Store {

    @Id
    private String id;
    private String name;
    private String address;
    private String logoUrl;
    private boolean isActive = true;

    // Nowe pola dla map
    private Double latitude;
    private Double longitude;
    private String googlePlaceId;
    private String phoneNumber;
    private String website;
    private Double rating;
    private Integer userRatingsCount;

    // Pole TRANSIENT dla obliczanej odległości (nie zapisuje się w bazie)
    @Transient
    private Double distanceFromUser;

    // Konstruktory
    public Store() {}

    public Store(String name, String address) {
        this.name = name;
        this.address = address;
    }

    // Pełny konstruktor
    public Store(String id, String name, String address, Double latitude, Double longitude) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.isActive = true;
    }

    // Gettery i settery dla podstawowych pól
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    // Gettery i settery dla pól map
    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getGooglePlaceId() {
        return googlePlaceId;
    }

    public void setGooglePlaceId(String googlePlaceId) {
        this.googlePlaceId = googlePlaceId;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public Integer getUserRatingsCount() {
        return userRatingsCount;
    }

    public void setUserRatingsCount(Integer userRatingsCount) {
        this.userRatingsCount = userRatingsCount;
    }

    // Gettery i settery dla distanceFromUser
    public Double getDistanceFromUser() {
        return distanceFromUser;
    }

    public void setDistanceFromUser(Double distanceFromUser) {
        this.distanceFromUser = distanceFromUser;
    }

    // Metoda pomocnicza do formatowania odległości
    public String getFormattedDistance() {
        if (distanceFromUser == null) return "";
        if (distanceFromUser < 1) {
            return Math.round(distanceFromUser * 1000) + " m";
        } else {
            return String.format("%.1f km", distanceFromUser);
        }
    }

    // Metody pomocnicze dla kompatybilności z frontendem
    public boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(boolean isActive) {
        this.isActive = isActive;
    }

    // Metoda do pobrania pierwszej litery nazwy (dla markerów)
    public String getInitial() {
        if (name != null && !name.isEmpty()) {
            return name.substring(0, 1).toUpperCase();
        }
        return "S";
    }

    // Metoda do pobrania skróconego adresu
    public String getShortAddress() {
        if (address == null || address.isEmpty()) {
            return "";
        }
        String[] parts = address.split(",");
        return parts.length > 0 ? parts[0].trim() : address;
    }

    // Metoda do obliczania odległości od punktu (jeśli potrzebna po stronie Java)
    public double calculateDistanceFrom(double otherLat, double otherLon) {
        if (latitude == null || longitude == null) {
            return -1;
        }

        final int R = 6371; // Promień Ziemi w km

        double latDistance = Math.toRadians(otherLat - latitude);
        double lonDistance = Math.toRadians(otherLon - longitude);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(latitude)) * Math.cos(Math.toRadians(otherLat))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    @Override
    public String toString() {
        return "Store{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", address='" + address + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", isActive=" + isActive +
                ", rating=" + rating +
                ", distanceFromUser=" + distanceFromUser +
                '}';
    }

    // Metoda do konwersji na Map (przydatna do API)
    public java.util.Map<String, Object> toMap() {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", id);
        map.put("name", name);
        map.put("address", address);
        map.put("latitude", latitude);
        map.put("longitude", longitude);
        map.put("isActive", isActive);
        map.put("rating", rating);
        map.put("phoneNumber", phoneNumber);
        map.put("website", website);
        map.put("userRatingsCount", userRatingsCount);
        map.put("distanceFromUser", distanceFromUser);
        map.put("formattedDistance", getFormattedDistance());
        return map;
    }

    // Metoda do kopiowania danych z innego Store
    public void copyFrom(Store other) {
        if (other == null) return;

        this.name = other.name;
        this.address = other.address;
        this.latitude = other.latitude;
        this.longitude = other.longitude;
        this.isActive = other.isActive;
        this.rating = other.rating;
        this.phoneNumber = other.phoneNumber;
        this.website = other.website;
        this.userRatingsCount = other.userRatingsCount;
        this.logoUrl = other.logoUrl;
        this.googlePlaceId = other.googlePlaceId;
        this.distanceFromUser = other.distanceFromUser;
    }

    // Metoda do sprawdzenia czy sklep ma koordynaty
    public boolean hasCoordinates() {
        return latitude != null && longitude != null;
    }

    // Metoda do pobrania lokalizacji jako tablicy [lat, lng]
    public double[] getLocation() {
        if (latitude == null || longitude == null) {
            return null;
        }
        return new double[]{latitude, longitude};
    }

    // Metoda do walidacji danych sklepu
    public boolean isValid() {
        return name != null && !name.trim().isEmpty() &&
                address != null && !address.trim().isEmpty() &&
                latitude != null && longitude != null;
    }
}