package com.lostandfound.backend.controller;

import com.lostandfound.backend.model.Post;
import com.lostandfound.backend.service.PostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "*")
public class SearchController {

    @Autowired
    private PostService postService;

    @PostMapping("/image")
    public List<Post> searchByImage(@RequestParam("file") MultipartFile file) throws IOException {
        return postService.searchByImage(file);
    }
}
