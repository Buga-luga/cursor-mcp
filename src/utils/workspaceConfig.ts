import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration interface for workspace paths
 * Defines the structure for managing workspace directories
 * @interface
 */
export interface WorkspaceConfig {
  /** Base directory for all Cursor workspaces */
  basePath: string;
  
  /** Directory for isolated shadow workspaces */
  shadowStoragePath: string;
}

/**
 * Retrieves the workspace configuration settings
 * Uses environment variables or defaults for path configuration
 * 
 * @returns {WorkspaceConfig} Workspace configuration object
 * 
 * Environment Variables:
 * - DEFAULT_WORKSPACE_PATH: Override the default workspace location
 * 
 * Default paths:
 * - basePath: ./cursor-workspaces (relative to current working directory)
 * - shadowStoragePath: {basePath}/shadow-workspaces
 */
export function getWorkspaceConfig(): WorkspaceConfig {
  // Use environment variable if set, otherwise use default path
  const basePath = process.env.DEFAULT_WORKSPACE_PATH || 
    path.join(process.cwd(), './cursor-workspaces');
  
  return {
    basePath,
    shadowStoragePath: path.join(basePath, 'shadow-workspaces')
  };
}

/**
 * Initializes the workspace directory structure
 * Creates necessary directories if they don't exist
 * Logs the initialized paths to stderr for debugging
 * 
 * Directory Structure:
 * cursor-workspaces/
 * └── shadow-workspaces/    (For isolated workspace instances)
 * 
 * @throws {Error} If directory creation fails
 */
export function initializeWorkspacePaths(): void {
  const config = getWorkspaceConfig();

  // Ensure directories exist, create if they don't
  fs.ensureDirSync(config.basePath);
  fs.ensureDirSync(config.shadowStoragePath);
  
  // Use console.error for logging to stderr instead of stdout
  // This prevents logs from interfering with data output
  console.error(`Workspace paths initialized:`);
  console.error(`Base: ${config.basePath}`);
  console.error(`Shadow: ${config.shadowStoragePath}`);
}