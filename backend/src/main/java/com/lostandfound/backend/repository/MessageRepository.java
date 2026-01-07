package com.lostandfound.backend.repository;

import com.lostandfound.backend.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findByChatId(String chatId);
}
