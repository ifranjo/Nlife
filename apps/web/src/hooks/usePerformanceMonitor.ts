import { useCallback, useEffect, useRef } from 'react';
import {
  performanceMonitor,
  trackToolPerformance,
  type PerformanceTimer,
  type ToolPerformanceSummary,
  type PerformanceBudget,
} from '../lib/performance-monitor';

interface UsePerformanceMonitorReturn {
  startTiming: () => PerformanceTimer;
  getSummary: (days?: number) => ToolPerformanceSummary | null;
  isWithinBudget: () => { withinBudget: boolean; violations: string[] };
  trackOperation: <T>(
    operation: () => Promise<T>,
    options?: {
      fileSize?: number;
      fileType?: string;
    }
  ) => Promise<T>;
}

/**
 * Hook for monitoring tool performance
 */
export function usePerformanceMonitor(toolId: string): UsePerformanceMonitorReturn {
  const timerRef = useRef<PerformanceTimer | null>(null);

  const startTiming = useCallback(() => {
    timerRef.current = performanceMonitor.startTiming(toolId);
    return timerRef.current;
  }, [toolId]);

  const getSummary = useCallback(
    (days?: number) => {
      return performanceMonitor.getToolSummary(toolId, days);
    },
    [toolId]
  );

  const isWithinBudget = useCallback(() => {
    return performanceMonitor.isWithinBudget(toolId);
  }, [toolId]);

  const trackOperation = useCallback(
    async <T>(
      operation: () => Promise<T>,
      options?: { fileSize?: number; fileType?: string }
    ): Promise<T> => {
      return trackToolPerformance(toolId, operation, options);
    },
    [toolId]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        // Timer will automatically record on success/error
        // If component unmounts without marking success/error,
        // we don't record to avoid incomplete metrics
      }
    };
  }, []);

  return {
    startTiming,
    getSummary,
    isWithinBudget,
    trackOperation,
  };
}

/**
 * Hook for getting all tool performance data
 */
export function useAllPerformanceData(days: number = 7) {
  const getAllSummaries = useCallback(() => {
    return performanceMonitor.getAllToolSummaries(days);
  }, [days]);

  const getSlowestTools = useCallback(
    (limit?: number) => {
      return performanceMonitor.getSlowestTools(limit, days);
    },
    [days]
  );

  const getDegradingTools = useCallback(() => {
    return performanceMonitor.getDegradingTools(days);
  }, [days]);

  const exportReport = useCallback(() => {
    return performanceMonitor.exportReport(days);
  }, [days]);

  return {
    getAllSummaries,
    getSlowestTools,
    getDegradingTools,
    exportReport,
  };
}

/**
 * Hook for managing performance budgets
 */
export function usePerformanceBudget(toolId?: string) {
  const setBudget = useCallback(
    (budget: PerformanceBudget) => {
      performanceMonitor.setBudget(budget);
    },
    []
  );

  const getBudget = useCallback(
    (id: string) => {
      return performanceMonitor.getBudget(id);
    },
    []
  );

  const getCurrentBudget = useCallback(() => {
    if (!toolId) return undefined;
    return performanceMonitor.getBudget(toolId);
  }, [toolId]);

  return {
    setBudget,
    getBudget,
    getCurrentBudget,
  };
}

/**
 * Hook for real-time performance tracking during file processing
 */
export function useProcessingTimer(toolId: string) {
  const timerRef = useRef<PerformanceTimer | null>(null);

  const start = useCallback(() => {
    timerRef.current = performanceMonitor.startTiming(toolId);
    return timerRef.current;
  }, [toolId]);

  const markLoadComplete = useCallback(() => {
    timerRef.current?.markLoadComplete();
  }, []);

  const recordInteraction = useCallback(() => {
    timerRef.current?.recordInteraction();
  }, []);

  const setFileInfo = useCallback((size: number, type: string) => {
    timerRef.current?.setFileInfo(size, type);
  }, []);

  const success = useCallback(() => {
    timerRef.current?.markSuccess();
    timerRef.current = null;
  }, []);

  const error = useCallback((message: string) => {
    timerRef.current?.markError(message);
    timerRef.current = null;
  }, []);

  return {
    start,
    markLoadComplete,
    recordInteraction,
    setFileInfo,
    success,
    error,
  };
}
