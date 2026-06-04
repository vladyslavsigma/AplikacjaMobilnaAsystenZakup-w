package org.example.shop.maps;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class GoogleMapsResponse {

    @JsonProperty("results")
    private List<PlaceResult> results;

    @JsonProperty("status")
    private String status;

    // Gettery i settery
    public List<PlaceResult> getResults() { return results; }
    public void setResults(List<PlaceResult> results) { this.results = results; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public static class PlaceResult {
        @JsonProperty("name")
        private String name;

        @JsonProperty("vicinity")
        private String vicinity;

        @JsonProperty("geometry")
        private Geometry geometry;

        @JsonProperty("place_id")
        private String placeId;

        @JsonProperty("rating")
        private Double rating;

        @JsonProperty("user_ratings_total")
        private Integer userRatingsTotal;

        @JsonProperty("opening_hours")
        private OpeningHours openingHours;

        // Gettery i settery
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getVicinity() { return vicinity; }
        public void setVicinity(String vicinity) { this.vicinity = vicinity; }

        public Geometry getGeometry() { return geometry; }
        public void setGeometry(Geometry geometry) { this.geometry = geometry; }

        public String getPlaceId() { return placeId; }
        public void setPlaceId(String placeId) { this.placeId = placeId; }

        public Double getRating() { return rating; }
        public void setRating(Double rating) { this.rating = rating; }

        public Integer getUserRatingsTotal() { return userRatingsTotal; }
        public void setUserRatingsTotal(Integer userRatingsTotal) { this.userRatingsTotal = userRatingsTotal; }

        public OpeningHours getOpeningHours() { return openingHours; }
        public void setOpeningHours(OpeningHours openingHours) { this.openingHours = openingHours; }
    }

    public static class Geometry {
        @JsonProperty("location")
        private Location location;

        public Location getLocation() { return location; }
        public void setLocation(Location location) { this.location = location; }
    }

    public static class Location {
        @JsonProperty("lat")
        private Double lat;

        @JsonProperty("lng")
        private Double lng;

        public Double getLat() { return lat; }
        public void setLat(Double lat) { this.lat = lat; }

        public Double getLng() { return lng; }
        public void setLng(Double lng) { this.lng = lng; }
    }

    public static class OpeningHours {
        @JsonProperty("open_now")
        private Boolean openNow;

        public Boolean getOpenNow() { return openNow; }
        public void setOpenNow(Boolean openNow) { this.openNow = openNow; }
    }
}