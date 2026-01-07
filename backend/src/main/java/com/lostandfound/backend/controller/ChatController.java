package com.lostandfound.backend.controller;

import com.lostandfound.backend.model.Chat;
import com.lostandfound.backend.model.Message;
import com.lostandfound.backend.repository.ChatRepository;
import com.lostandfound.backend.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ChatRepository chatRepository;

    // Get all chats for a user
    @GetMapping
    public List<Chat> getMyChats(@RequestParam String userId) {
        return chatRepository.findByUser1IdOrUser2Id(userId, userId);
    }

    // Get messages for a specific chat
    @GetMapping("/{chatId}/messages")
    public List<Message> getChatMessages(@PathVariable String chatId) {
        return messageRepository.findByChatId(chatId);
    }

    @PostMapping("/{chatId}/messages")
    public Message sendMessage(@PathVariable String chatId, @RequestBody Message message) {
        // In real app: Verify user is part of chat
        Chat chat = chatRepository.findById(chatId).orElseThrow();
        message.setChat(chat);
        return messageRepository.save(message);
    }
}
