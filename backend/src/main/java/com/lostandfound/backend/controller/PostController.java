package com.lostandfound.backend.controller;

import com.lostandfound.backend.model.Post;
import com.lostandfound.backend.service.PostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = "*")
public class PostController {

    @Autowired
    private PostService postService;

    @Autowired
    private com.lostandfound.backend.repository.UserRepository userRepository;

    @GetMapping
    public List<Post> getAllPosts() {
        return postService.getAllPosts();
    }

    @PostMapping
    public Post createPost(@RequestBody com.lostandfound.backend.dto.PostDTO postDTO) {
        Post post = new Post();
        post.setTitle(postDTO.getTitle());
        post.setDescription(postDTO.getDescription());
        try {
            post.setType(Post.PostType.valueOf(postDTO.getType()));
        } catch (IllegalArgumentException | NullPointerException e) {
            post.setType(Post.PostType.LOST); // Default
        }
        post.setCategory(postDTO.getCategory());
        post.setContactInfo(postDTO.getContactInfo());
        post.setImageUrl(postDTO.getImageUrl());

        if (postDTO.getLocation() != null) {
            post.setLocation(new org.springframework.data.mongodb.core.geo.GeoJsonPoint(
                    postDTO.getLocation().getLng(),
                    postDTO.getLocation().getLat()));
        }

        if (postDTO.getUserId() != null && !postDTO.getUserId().equals("guest")) {
            com.lostandfound.backend.model.User user = userRepository.findById(postDTO.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            post.setUser(user);
        } else {
            throw new RuntimeException("Authentication required to post");
        }

        return postService.savePost(post);
    }

    @PostMapping("/upload-image")
    @PostMapping("/upload-image")
    public String uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            // Save file to a local directory (simple implementation for MVP)
            String uploadDir = "uploads/";
            java.io.File directory = new java.io.File(uploadDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            java.nio.file.Path filePath = java.nio.file.Paths.get(uploadDir + fileName);
            java.nio.file.Files.write(filePath, file.getBytes());

            // Return a path that the backend can recognize later (or a full URL if serving
            // static files)
            // For now, returning the absolute path or relative path to be used by the
            // service
            return filePath.toAbsolutePath().toString();
        } catch (java.io.IOException e) {
            e.printStackTrace();
            return "https://via.placeholder.com/300?text=UploadFailed";
        }
    }
}
