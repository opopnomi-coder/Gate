/**
 * offlineQueue.service.ts
 *
 * Offline action queue with exponential backoff retry.
 * Queues API calls that fail due to network issues and retries them
 * automatically when connectivity is restored.
 *
 * Usage:
 *   offlineQueue.enqueue({ type: 'APPROVE', url, method, body })
 *   offlineQueue.start()  // call on app mount
 *   offlineQueue.stop()   // call on app unmount
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API_CONFIG } from '../config/api.config';

const QUEUE_KEY = '@ritgate_offline_queue';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

export interface QueuedAction {
  id: string;
  type: string;          // e.g. 'APPROVE', 'REJECT', 'MARK_READ'
  url: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: object;
  retries: number;
  createdAt: number;
  lastAttempt?: number;
}

class OfflineQueueService {
  private processing = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  /** Add an action to the queue */
  async enqueue(action: Omit<QueuedAction, 'id' | 'retries' | 'createdAt'>): Promise<void> {
    const item: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      retries: 0,
      createdAt: Date.now(),
    };
    const queue = await this.load();
    queue.push(item);
    await this.save(queue);
    console.log(`📥 [OfflineQueue] Enqueued: ${item.type}`);
    this.processQueue();
  }

  /** Start listening for connectivity changes */
  start(): void {
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('🌐 [OfflineQueue] Network restored — processing queue');
        this.processQueue();
      }
    });
    // Process any pending items on startup
    this.processQueue();
  }

  stop(): void {
    this.unsubscribeNetInfo?.();
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    const queue = await this.load();
    if (queue.length === 0) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    this.processing = true;
    const remaining: QueuedAction[] = [];

    for (const item of queue) {
      const success = await this.attempt(item);
      if (!success) {
        item.retries += 1;
        item.lastAttempt = Date.now();
        if (item.retries < MAX_RETRIES) {
          remaining.push(item);
          // Schedule retry with exponential backoff
          const delay = BASE_DELAY_MS * Math.pow(2, item.retries);
          console.log(`⏳ [OfflineQueue] Retry ${item.retries}/${MAX_RETRIES} for ${item.type} in ${delay}ms`);
          this.retryTimer = setTimeout(() => this.processQueue(), delay);
        } else {
          console.warn(`❌ [OfflineQueue] Dropped after ${MAX_RETRIES} retries: ${item.type}`);
        }
      } else {
        console.log(`✅ [OfflineQueue] Processed: ${item.type}`);
      }
    }

    await this.save(remaining);
    this.processing = false;
  }

  private async attempt(item: QueuedAction): Promise<boolean> {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async load(): Promise<QueuedAction[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async save(queue: QueuedAction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {}
  }

  async getPendingCount(): Promise<number> {
    const q = await this.load();
    return q.length;
  }
}

export const offlineQueue = new OfflineQueueService();
