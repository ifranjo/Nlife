/**
 * Analytics module type check test
 * This file verifies that the analytics module compiles correctly
 */

import {
  trackEvent,
  trackToolUse,
  trackConversion,
  trackToolPageView,
  trackToolError,
  trackEngagement,
  trackGuideView,
  trackUseCaseView,
  trackPerformance,
  trackFeatureUsage,
  trackOutboundLink,
  createTrackedDownload,
  createPerformanceTimer,
  trackWorkflow,
  type ToolAction,
  type ConversionType,
  type ToolCategory,
} from './analytics';

// Type assertions to verify exports exist and have correct signatures
const _trackEvent: typeof trackEvent = trackEvent;
const _trackToolUse: typeof trackToolUse = trackToolUse;
const _trackConversion: typeof trackConversion = trackConversion;
const _trackToolPageView: typeof trackToolPageView = trackToolPageView;
const _trackToolError: typeof trackToolError = trackToolError;
const _trackEngagement: typeof trackEngagement = trackEngagement;
const _trackGuideView: typeof trackGuideView = trackGuideView;
const _trackUseCaseView: typeof trackUseCaseView = trackUseCaseView;
const _trackPerformance: typeof trackPerformance = trackPerformance;
const _trackFeatureUsage: typeof trackFeatureUsage = trackFeatureUsage;
const _trackOutboundLink: typeof trackOutboundLink = trackOutboundLink;
const _createTrackedDownload: typeof createTrackedDownload = createTrackedDownload;
const _createPerformanceTimer: typeof createPerformanceTimer = createPerformanceTimer;
const _trackWorkflow: typeof trackWorkflow = trackWorkflow;

// Type checks
const _action: ToolAction = 'file_uploaded';
const _conversion: ConversionType = 'download_completed';
const _category: ToolCategory = 'document';

// Prevent unused variable warnings
export {
  _trackEvent,
  _trackToolUse,
  _trackConversion,
  _trackToolPageView,
  _trackToolError,
  _trackEngagement,
  _trackGuideView,
  _trackUseCaseView,
  _trackPerformance,
  _trackFeatureUsage,
  _trackOutboundLink,
  _createTrackedDownload,
  _createPerformanceTimer,
  _trackWorkflow,
  _action,
  _conversion,
  _category,
};
