/**
 * @fileoverview Handles task management in Cursor IDE.
 * Provides functionality to create, update, and track tasks.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface TaskFile {
    path: string;
    content?: string;
    changes?: Array<{
        type: 'add' | 'modify' | 'delete';
        location: string;
        content?: string;
    }>;
}

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    assignedTo?: 'cline' | 'claude';
    files: TaskFile[];
    metadata: {
        created: number;
        lastUpdated: number;
        conversationId?: string; // Reference to Claude conversation if any
    };
}

/**
 * Manages tasks in Cursor IDE
 * Handles task creation, updates, and tracking
 */
export class CursorTaskHandler {
    private tasksPath: string;

    constructor() {
        // Store tasks in the Cursor workspace
        this.tasksPath = path.join(process.cwd(), '.cursor', 'tasks');
        this.initializeDirectories();
    }

    /**
     * Initializes required directories
     */
    private async initializeDirectories() {
        try {
            await fs.mkdir(this.tasksPath, { recursive: true });
        } catch (error) {
            console.error('Error creating task directories:', error);
            throw error;
        }
    }

    /**
     * Creates a new task
     * @param title Task title
     * @param description Task description
     * @param files Files associated with the task
     * @param assignedTo Who the task is assigned to
     * @returns Task ID
     */
    async createTask(
        title: string,
        description: string,
        files: TaskFile[],
        assignedTo?: 'cline' | 'claude'
    ): Promise<string> {
        const taskId = uuidv4();
        const task: Task = {
            id: taskId,
            title,
            description,
            status: 'pending',
            assignedTo,
            files,
            metadata: {
                created: Date.now(),
                lastUpdated: Date.now()
            }
        };

        await this.saveTask(task);
        return taskId;
    }

    /**
     * Updates a task's status
     * @param taskId ID of the task to update
     * @param status New status
     * @param conversationId Optional Claude conversation ID
     */
    async updateTaskStatus(
        taskId: string,
        status: Task['status'],
        conversationId?: string
    ): Promise<void> {
        const task = await this.loadTask(taskId);
        
        task.status = status;
        task.metadata.lastUpdated = Date.now();
        if (conversationId) {
            task.metadata.conversationId = conversationId;
        }

        await this.saveTask(task);
    }

    /**
     * Updates files associated with a task
     * @param taskId ID of the task
     * @param files Updated files
     */
    async updateTaskFiles(taskId: string, files: TaskFile[]): Promise<void> {
        const task = await this.loadTask(taskId);
        
        task.files = files;
        task.metadata.lastUpdated = Date.now();

        await this.saveTask(task);
    }

    /**
     * Gets a task by ID
     * @param taskId ID of the task
     * @returns Task details
     */
    async getTask(taskId: string): Promise<Task> {
        return await this.loadTask(taskId);
    }

    /**
     * Lists all tasks
     * @param filter Optional filter criteria
     * @returns Array of tasks matching the filter
     */
    async listTasks(filter?: {
        status?: Task['status'];
        assignedTo?: 'cline' | 'claude';
    }): Promise<Task[]> {
        const files = await fs.readdir(this.tasksPath);
        const tasks: Task[] = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const task = await this.loadTask(file.replace('.json', ''));
                
                // Apply filters if provided
                if (filter) {
                    if (filter.status && task.status !== filter.status) continue;
                    if (filter.assignedTo && task.assignedTo !== filter.assignedTo) continue;
                }

                tasks.push(task);
            }
        }

        return tasks;
    }

    /**
     * Loads a task from disk
     * @param taskId ID of the task to load
     */
    private async loadTask(taskId: string): Promise<Task> {
        const filePath = path.join(this.tasksPath, `${taskId}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`Failed to load task ${taskId}: ${error}`);
        }
    }

    /**
     * Saves a task to disk
     * @param task Task to save
     */
    private async saveTask(task: Task): Promise<void> {
        const filePath = path.join(this.tasksPath, `${task.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(task, null, 2));
    }

    /**
     * Assigns a task to Cline or Claude
     * @param taskId ID of the task
     * @param assignTo Who to assign the task to
     */
    async assignTask(taskId: string, assignTo: 'cline' | 'claude'): Promise<void> {
        const task = await this.loadTask(taskId);
        
        task.assignedTo = assignTo;
        task.metadata.lastUpdated = Date.now();

        await this.saveTask(task);
    }
}
