package com.lostandfound.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DBRef;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Document(collection = "chats")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Chat {
    @Id
    private String id;

    @DBRef
    private User user1;

    @DBRef
    private User user2;

    @DBRef
    private Post relatedPost;

    private LocalDateTime createdAt = LocalDateTime.now();
}
