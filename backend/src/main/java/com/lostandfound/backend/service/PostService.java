package com.lostandfound.backend.service;

import com.lostandfound.backend.model.Post;
import com.lostandfound.backend.repository.PostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
public class PostService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private RestTemplate restTemplate;

    public List<Post> getAllPosts() {
        return postRepository.findAll();
    }

    public Post savePost(Post post) {
        // 1. Save initial post
        Post savedPost = postRepository.save(post);

        // 2. Generate Embedding if image exists
        if (post.getImageUrl() != null && !post.getImageUrl().isEmpty()) {
            try {
                String imagePath = post.getImageUrl();
                // Check if it is a local file path we just saved
                java.nio.file.Path path = java.nio.file.Paths.get(imagePath);

                if (java.nio.file.Files.exists(path)) {
                    // We need to send this file to the AI Service
                    org.springframework.core.io.FileSystemResource resource = new org.springframework.core.io.FileSystemResource(
                            path);

                    org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                    headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

                    org.springframework.util.MultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
                    body.add("file", resource);

                    org.springframework.http.HttpEntity<org.springframework.util.MultiValueMap<String, Object>> requestEntity = new org.springframework.http.HttpEntity<>(
                            body, headers);

                    @SuppressWarnings("unchecked")
                    java.util.Map<String, Object> response = restTemplate.postForObject("http://localhost:8000/embed",
                            requestEntity, java.util.Map.class);

                    if (response != null && response.containsKey("vector")) {
                        @SuppressWarnings("unchecked")
                        List<Double> vectorList = (List<Double>) response.get("vector");
                        double[] embedding = new double[vectorList.size()];
                        for (int i = 0; i < vectorList.size(); i++) {
                            embedding[i] = vectorList.get(i);
                        }
                        savedPost.setEmbedding(embedding);
                        // Update the post with embedding
                        postRepository.save(savedPost);
                    }
                }
            } catch (Exception e) {
                System.err.println("AI Service unavailable or File Error: " + e.getMessage());
            }
        }
        return savedPost;
    }

    public List<Post> searchByImage(org.springframework.web.multipart.MultipartFile file) {
        try {
            // 1. Call AI Service to get embedding for the uploaded file
            // We need to send the file to the Python service
            // Creating a map for the request part
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

            org.springframework.util.MultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
            body.add("file", file.getResource());

            org.springframework.http.HttpEntity<org.springframework.util.MultiValueMap<String, Object>> requestEntity = new org.springframework.http.HttpEntity<>(
                    body, headers);

            // Assuming AI service returns { "vector": [0.1, ...], "message": "..." }
            // We need a response class or just use Map
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> response = restTemplate.postForObject("http://localhost:8000/embed",
                    requestEntity, java.util.Map.class);

            if (response != null && response.containsKey("vector")) {
                @SuppressWarnings("unchecked")
                List<Double> vectorList = (List<Double>) response.get("vector");
                // Convert List<Double> to double[]
                double[] embedding = new double[vectorList.size()];
                for (int i = 0; i < vectorList.size(); i++) {
                    embedding[i] = vectorList.get(i);
                }

                // 2. Use the embedding to query the database using pgvector
                // return postRepository.findByEmbeddingNearest(embedding);
                return postRepository.findAll(); // simplified for now
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return postRepository.findAll();
    }

    private void findMatches(Post newPost) {
        // Mock matching logic: Find opposite type posts
        String oppositeType = newPost.getType().name().equals("LOST") ? "FOUND" : "LOST";
        List<Post> potentialMatches = postRepository.findByTitleContainingIgnoreCase(newPost.getTitle());
    }
}
