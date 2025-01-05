/**
 * @fileoverview Manages workspace configuration and initialization.
 * Provides functionality for setting up and accessing workspace paths
 * for both regular and shadow workspaces.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';

dotenv.config();

/**
 * Configuration interface for workspace paths
 * @interface WorkspaceConfig
 * @property {string} basePath - Root path for all workspaces
 * @property {string} shadowStoragePath - Path for isolated shadow workspaces
 */
export interface WorkspaceConfig {
  basePath: string;
  shadowStoragePath: string;
}

/**
 * Retrieves the workspace configuration
 * Uses environment variables or defaults for path configuration
 * 
 * @returns {WorkspaceConfig} Workspace path configuration
 */
export function getWorkspaceConfig(): WorkspaceConfig {
  const basePath = process.env.DEFAULT_WORKSPACE_PATH || 
    path.join(process.cwd(), './cursor-workspaces');
  
  return {
    basePath,
    shadowStoragePath: path.join(basePath, 'shadow-workspaces')
  };
}

/**
 * Initializes workspace directory structure
 * Creates base and shadow workspace directories if they don't exist
 * Must be called before any workspace operations
 */
export function initializeWorkspacePaths(): void {
  const config = getWorkspaceConfig();
  fs.ensureDirSync(config.basePath);
  fs.ensureDirSync(config.shadowStoragePath);
}