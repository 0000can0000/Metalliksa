import path from 'node:path';

/** Trusted internal worker metadata only. No browser-supplied path/mapping. */
export function archiveJobRoot(root: string, workerPlatform: string, hostPlatform: string): string {
  if (typeof root !== 'string' || !root || /[\x00-\x1f]/.test(root)
    || root.split(/[\\/]/).some(part => part === '..' || part === '.')) throw new Error('Invalid worker archive root');
  if (workerPlatform === hostPlatform && ['win32', 'linux', 'darwin'].includes(hostPlatform)) {
    const paths = hostPlatform === 'win32' ? path.win32 : path.posix;
    if (!paths.isAbsolute(root) || (hostPlatform === 'win32' && !/^[A-Za-z]:[\\/]/.test(root))) throw new Error('Worker archive root must be absolute');
    return paths.normalize(root);
  }
  if (hostPlatform === 'win32' && workerPlatform === 'linux') {
    const shared = /^\/mnt\/([a-zA-Z])\/(.+)$/.exec(root);
    if (shared && !/[\\:]/.test(shared[2])) return `${shared[1].toUpperCase()}:\\${shared[2].replaceAll('/', '\\')}`;
    throw new Error('WSL archive requires a shared /mnt/drive job root');
  }
  throw new Error('Worker archive filesystem is not accessible from this host');
}
