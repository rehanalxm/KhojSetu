package com.lostandfound.backend.repository;

import com.lostandfound.backend.model.Chat;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ChatRepository extends MongoRepository<Chat, String> {
    List<Chat> findByUser1IdOrUser2Id(String user1Id, String user2Id);
}
