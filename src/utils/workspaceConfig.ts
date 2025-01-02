import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';

dotenv.config();

export interface WorkspaceConfig {
  basePath: string;
  shadowStoragePath: string;
}

export function getWorkspaceConfig(): WorkspaceConfig {
  const basePath = process.env.DEFAULT_WORKSPACE_PATH || 
    path.join(process.cwd(), './cursor-workspaces');
  
  return {
    basePath,
    shadowStoragePath: path.join(basePath, 'shadow-workspaces')
  };
}

export function initializeWorkspacePaths(): void {
  const config = getWorkspaceConfig();
  fs.ensureDirSync(config.basePath);
  fs.ensureDirSync(config.shadowStoragePath);
  
  // Use console.error for logging to stderr instead of stdout
  console.error(`Workspace paths initialized:`);
  console.error(`Base: ${config.basePath}`);
  console.error(`Shadow: ${config.shadowStoragePath}`);
}