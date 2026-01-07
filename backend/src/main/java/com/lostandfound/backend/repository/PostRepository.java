package com.lostandfound.backend.repository;

import com.lostandfound.backend.model.Post;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Point;
import java.util.List;

public interface PostRepository extends MongoRepository<Post, String> {
    List<Post> findByTitleContainingIgnoreCase(String title);

    // MongoDB "Near" query
    List<Post> findByLocationNear(Point location, Distance distance);
}
