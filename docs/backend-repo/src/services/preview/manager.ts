// =============================================================================
// Preview Server Manager
// =============================================================================
// Manages lifecycle of Vite dev servers for workspace previews.
// Each workspace gets its own isolated preview server.

import { execa, ExecaChildProcess } from 'execa';
import treeKill from 'tree-kill';
import getPort from 'get-port';
import { previewLogger as logger } from '../../utils/logger';
import { env } from '../../config/env';

// =============================================================================
// TYPES
// =============================================================================

interface PreviewServer {
  workspaceId: string;
  port: number;
  url: string;
  process: ExecaChildProcess | null;
  status: 'starting' | 'running' | 'stopped' | 'error';
  startedAt: Date | null;
}

// =============================================================================
// MANAGER
// =============================================================================

export class PreviewManager {
  private static servers = new Map<string, PreviewServer>();
  private static portPool = new Set<number>();

  static async initialize(): Promise<void> {
    logger.info('Preview manager initialized');
    
    // Clean up any orphan servers on shutdown
    process.on('SIGTERM', () => this.shutdownAll());
    process.on('SIGINT', () => this.shutdownAll());
  }

  static async start(workspaceId: string): Promise<string> {
    // Check if already running
    const existing = this.servers.get(workspaceId);
    if (existing?.status === 'running') {
      return existing.url;
    }

    // Get available port
    const port = await getPort({
      port: getPort.makeRange(env.PREVIEW_BASE_PORT, env.PREVIEW_BASE_PORT + env.PREVIEW_MAX_SERVERS),
      exclude: [...this.portPool],
    });

    this.portPool.add(port);

    const server: PreviewServer = {
      workspaceId,
      port,
      url: `http://${env.PREVIEW_HOST}:${port}`,
      process: null,
      status: 'starting',
      startedAt: null,
    };

    this.servers.set(workspaceId, server);

    try {
      // Start Vite dev server
      // Note: In production, this would run in Docker/E2B container
      const workspaceDir = this.getWorkspaceDir(workspaceId);
      
      const process = execa('npm', ['run', 'dev', '--', '--port', String(port), '--host'], {
        cwd: workspaceDir,
        stdio: 'pipe',
      });

      server.process = process;

      // Wait for server to be ready
      await this.waitForReady(port);

      server.status = 'running';
      server.startedAt = new Date();

      logger.info({ workspaceId, port, url: server.url }, 'Preview server started');

      return server.url;

    } catch (error) {
      server.status = 'error';
      this.portPool.delete(port);
      logger.error({ error, workspaceId }, 'Failed to start preview server');
      throw error;
    }
  }

  static async stop(workspaceId: string): Promise<void> {
    const server = this.servers.get(workspaceId);
    if (!server) return;

    if (server.process?.pid) {
      await new Promise<void>((resolve, reject) => {
        treeKill(server.process!.pid!, 'SIGTERM', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    this.portPool.delete(server.port);
    server.status = 'stopped';
    server.process = null;
    this.servers.delete(workspaceId);

    logger.info({ workspaceId }, 'Preview server stopped');
  }

  static async restart(workspaceId: string): Promise<string> {
    await this.stop(workspaceId);
    return this.start(workspaceId);
  }

  static getStatus(workspaceId: string): PreviewServer | null {
    const server = this.servers.get(workspaceId);
    if (!server) return null;

    return {
      ...server,
      process: null, // Don't expose process object
    };
  }

  private static getWorkspaceDir(workspaceId: string): string {
    // In production, this would be a proper workspace directory
    // possibly mounted from a Docker volume or container filesystem
    return `/workspaces/${workspaceId}`;
  }

  private static async waitForReady(port: number, timeout = 30000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}`);
        if (response.ok || response.status === 404) {
          return; // Server is up
        }
      } catch {
        // Not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Preview server did not start within ${timeout}ms`);
  }

  private static async shutdownAll(): Promise<void> {
    logger.info('Shutting down all preview servers');
    
    const stopPromises = Array.from(this.servers.keys()).map(id => this.stop(id));
    await Promise.allSettled(stopPromises);
    
    logger.info('All preview servers stopped');
  }
}
