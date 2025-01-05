/**
 * @fileoverview Handles interactions with Claude Desktop application.
 * Provides functionality to send/receive messages and manage conversations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface ClaudeMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface Conversation {
    id: string;
    messages: ClaudeMessage[];
    metadata: {
        title?: string;
        created: number;
        lastUpdated: number;
    };
}

/**
 * Manages interactions with Claude Desktop
 * Handles message sending/receiving and conversation management
 */
export class ClaudeDesktopHandler {
    private claudeConfigPath: string;
    private conversationsPath: string;

    constructor() {
        // Claude Desktop stores its data in the user's app data
        this.claudeConfigPath = path.join(process.env.APPDATA || '', 'Claude');
        this.conversationsPath = path.join(this.claudeConfigPath, 'conversations');
        this.initializeDirectories();
    }

    /**
     * Initializes required directories
     */
    private async initializeDirectories() {
        try {
            await fs.mkdir(this.conversationsPath, { recursive: true });
        } catch (error) {
            console.error('Error creating Claude directories:', error);
            throw error;
        }
    }

    /**
     * Creates a new conversation
     * @param title Optional title for the conversation
     * @returns Conversation ID
     */
    async createConversation(title?: string): Promise<string> {
        const conversationId = uuidv4();
        const conversation: Conversation = {
            id: conversationId,
            messages: [],
            metadata: {
                title,
                created: Date.now(),
                lastUpdated: Date.now()
            }
        };

        await this.saveConversation(conversation);
        return conversationId;
    }

    /**
     * Sends a message to Claude Desktop
     * @param conversationId ID of the conversation
     * @param content Message content
     * @returns Message ID
     */
    async sendMessage(conversationId: string, content: string): Promise<string> {
        const conversation = await this.loadConversation(conversationId);
        
        const message: ClaudeMessage = {
            id: uuidv4(),
            role: 'user',
            content,
            timestamp: Date.now()
        };

        conversation.messages.push(message);
        conversation.metadata.lastUpdated = Date.now();
        
        await this.saveConversation(conversation);
        return message.id;
    }

    /**
     * Gets the latest response from Claude
     * @param conversationId ID of the conversation
     * @returns Latest assistant message or null if none exists
     */
    async getLatestResponse(conversationId: string): Promise<ClaudeMessage | null> {
        const conversation = await this.loadConversation(conversationId);
        
        // Find the last assistant message
        for (let i = conversation.messages.length - 1; i >= 0; i--) {
            if (conversation.messages[i].role === 'assistant') {
                return conversation.messages[i];
            }
        }
        
        return null;
    }

    /**
     * Lists all conversations
     * @returns Array of conversations with metadata
     */
    async listConversations(): Promise<Array<{ id: string; metadata: Conversation['metadata'] }>> {
        const files = await fs.readdir(this.conversationsPath);
        const conversations: Array<{ id: string; metadata: Conversation['metadata'] }> = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const conversation = await this.loadConversation(file.replace('.json', ''));
                conversations.push({
                    id: conversation.id,
                    metadata: conversation.metadata
                });
            }
        }

        return conversations;
    }

    /**
     * Loads a conversation from disk
     * @param conversationId ID of the conversation to load
     */
    private async loadConversation(conversationId: string): Promise<Conversation> {
        const filePath = path.join(this.conversationsPath, `${conversationId}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`Failed to load conversation ${conversationId}: ${error}`);
        }
    }

    /**
     * Saves a conversation to disk
     * @param conversation Conversation to save
     */
    private async saveConversation(conversation: Conversation): Promise<void> {
        const filePath = path.join(this.conversationsPath, `${conversation.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
    }
}
