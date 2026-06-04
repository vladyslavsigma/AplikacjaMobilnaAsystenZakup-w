package org.example.shop.maps;

public class RadiusSearchRequest {
    private Double latitude;
    private Double longitude;
    private Double radiusKm = 5.0;

    // Konstruktor domyślny
    public RadiusSearchRequest() {}

    // Konstruktor z parametrami
    public RadiusSearchRequest(Double latitude, Double longitude, Double radiusKm) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.radiusKm = radiusKm;
    }

    // Gettery i settery
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getRadiusKm() { return radiusKm; }
    public void setRadiusKm(Double radiusKm) { this.radiusKm = radiusKm; }

    @Override
    public String toString() {
        return "RadiusSearchRequest{" +
                "latitude=" + latitude +
                ", longitude=" + longitude +
                ", radiusKm=" + radiusKm +
                '}';
    }
}