package com.lostandfound.backend.dto;

import lombok.Data;

@Data
public class PostDTO {
    private String title;
    private String description;
    private String type; // LOST, FOUND
    private String category;
    private String imageUrl;
    private LocationDTO location;
    private String userId;
    private String contactInfo;
    private String createdByName;

    @Data
    public static class LocationDTO {
        private double lat;
        private double lng;
        private String name;
    }
}
