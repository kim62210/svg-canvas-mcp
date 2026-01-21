/**
 * 히스토리 관리자
 * Undo/Redo 기능 지원을 위한 작업 이력 관리
 */

import type { HistoryEntry, HistoryState, SVGDocument } from '../types/index.js';
import { generateUUID } from './id-generator.js';

// 스냅샷 타입 (문서 전체 상태)
interface DocumentSnapshot {
  document: SVGDocument;
  timestamp: Date;
}

/**
 * 히스토리 관리자 클래스
 */
export class HistoryManager {
  private entries: HistoryEntry[] = [];
  private snapshots: Map<string, DocumentSnapshot> = new Map();
  private currentIndex: number = -1;
  private maxEntries: number;
  private isRecording: boolean = true;

  constructor(maxEntries: number = 100) {
    this.maxEntries = maxEntries;
  }

  /**
   * 작업 기록 추가
   */
  record(action: string, description: string, documentState: SVGDocument): void {
    if (!this.isRecording) return;

    // 현재 위치 이후의 기록 삭제 (redo 불가능하게)
    if (this.currentIndex < this.entries.length - 1) {
      const removedEntries = this.entries.splice(this.currentIndex + 1);
      // 삭제된 엔트리의 스냅샷도 정리
      for (const entry of removedEntries) {
        this.snapshots.delete(entry.id);
      }
    }

    // 새 엔트리 생성
    const entry: HistoryEntry = {
      id: generateUUID('history'),
      action,
      timestamp: new Date(),
      data: null, // 스냅샷 ID 대신 별도 저장
      description
    };

    // 스냅샷 저장
    this.snapshots.set(entry.id, {
      document: JSON.parse(JSON.stringify(documentState)),
      timestamp: entry.timestamp
    });

    this.entries.push(entry);
    this.currentIndex = this.entries.length - 1;

    // 최대 개수 초과 시 오래된 기록 삭제
    while (this.entries.length > this.maxEntries) {
      const removed = this.entries.shift();
      if (removed) {
        this.snapshots.delete(removed.id);
      }
      this.currentIndex--;
    }
  }

  /**
   * Undo (실행 취소)
   * @returns 복원할 문서 상태 또는 null
   */
  undo(steps: number = 1): SVGDocument | null {
    if (!this.canUndo()) return null;

    const targetIndex = Math.max(0, this.currentIndex - steps);

    // 이전 상태로 이동
    if (targetIndex > 0) {
      this.currentIndex = targetIndex - 1;
      const entry = this.entries[this.currentIndex];
      const snapshot = this.snapshots.get(entry.id);
      return snapshot ? JSON.parse(JSON.stringify(snapshot.document)) : null;
    } else {
      // 가장 처음 상태
      this.currentIndex = -1;
      const firstEntry = this.entries[0];
      const snapshot = this.snapshots.get(firstEntry.id);
      return snapshot ? JSON.parse(JSON.stringify(snapshot.document)) : null;
    }
  }

  /**
   * Redo (다시 실행)
   * @returns 복원할 문서 상태 또는 null
   */
  redo(steps: number = 1): SVGDocument | null {
    if (!this.canRedo()) return null;

    const targetIndex = Math.min(this.entries.length - 1, this.currentIndex + steps);
    this.currentIndex = targetIndex;

    const entry = this.entries[this.currentIndex];
    const snapshot = this.snapshots.get(entry.id);
    return snapshot ? JSON.parse(JSON.stringify(snapshot.document)) : null;
  }

  /**
   * 특정 시점으로 이동
   */
  goto(historyIndex: number): SVGDocument | null {
    if (historyIndex < 0 || historyIndex >= this.entries.length) {
      return null;
    }

    this.currentIndex = historyIndex;
    const entry = this.entries[this.currentIndex];
    const snapshot = this.snapshots.get(entry.id);
    return snapshot ? JSON.parse(JSON.stringify(snapshot.document)) : null;
  }

  /**
   * Undo 가능 여부
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Redo 가능 여부
   */
  canRedo(): boolean {
    return this.currentIndex < this.entries.length - 1;
  }

  /**
   * 기록 일시 중지
   */
  pauseRecording(): void {
    this.isRecording = false;
  }

  /**
   * 기록 재개
   */
  resumeRecording(): void {
    this.isRecording = true;
  }

  /**
   * 히스토리 목록 조회
   */
  getHistory(limit?: number): HistoryEntry[] {
    const entries = [...this.entries];
    if (limit && limit > 0) {
      return entries.slice(-limit);
    }
    return entries;
  }

  /**
   * 현재 인덱스 조회
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * 총 히스토리 개수
   */
  getCount(): number {
    return this.entries.length;
  }

  /**
   * 히스토리 상태 조회
   */
  getState(): HistoryState {
    return {
      entries: this.entries.map(e => ({ ...e })),
      currentIndex: this.currentIndex,
      maxEntries: this.maxEntries
    };
  }

  /**
   * 히스토리 초기화
   */
  clear(): void {
    this.entries = [];
    this.snapshots.clear();
    this.currentIndex = -1;
  }

  /**
   * 여러 작업을 하나의 그룹으로 묶기
   */
  beginGroup(): void {
    this.pauseRecording();
  }

  /**
   * 그룹 종료 및 하나의 엔트리로 기록
   */
  endGroup(action: string, description: string, documentState: SVGDocument): void {
    this.resumeRecording();
    this.record(action, description, documentState);
  }

  /**
   * 직렬화 (저장용)
   */
  toJSON(): {
    entries: Array<{ action: string; timestamp: string; description: string }>;
    currentIndex: number;
  } {
    return {
      entries: this.entries.map(e => ({
        action: e.action,
        timestamp: e.timestamp.toISOString(),
        description: e.description
      })),
      currentIndex: this.currentIndex
    };
  }
}

// 싱글톤 인스턴스
let currentHistoryManager: HistoryManager | null = null;

/**
 * 현재 히스토리 매니저 가져오기
 */
export function getHistoryManager(): HistoryManager {
  if (!currentHistoryManager) {
    currentHistoryManager = new HistoryManager();
  }
  return currentHistoryManager;
}

/**
 * 히스토리 매니저 초기화
 */
export function resetHistoryManager(): void {
  currentHistoryManager = null;
}
