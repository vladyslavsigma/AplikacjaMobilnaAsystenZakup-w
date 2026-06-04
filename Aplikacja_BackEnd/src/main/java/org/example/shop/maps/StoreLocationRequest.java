package org.example.shop.maps;

public class StoreLocationRequest {
    private String storeName;
    private String address;
    private Double latitude;
    private Double longitude;
    private Integer radius; // w metrach
    private String type; // np: supermarket, grocery_store

    // Gettery i settery
    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Integer getRadius() { return radius; }
    public void setRadius(Integer radius) { this.radius = radius; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}