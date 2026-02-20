/**
 * Competitor data for comparison tables
 * Used by ComparisonTable.astro component
 */

export const competitorData = {
  'pdf-merge': {
    competitors: [
      {
        name: 'SmallPDF',
        features: {
          price: '$12/month',
          privacy: 'Cloud upload required',
          accountRequired: 'Yes',
          usageLimits: '2 tasks/day free',
          watermarks: 'Yes (free version)',
          worksOffline: 'No',
          bulkProcessing: 'Yes (paid)',
          processingSpeed: 'Fast (server)',
          fileSizeLimit: '100MB max'
        }
      },
      {
        name: 'iLovePDF',
        features: {
          price: '$7/month',
          privacy: 'Cloud upload required',
          accountRequired: 'Yes',
          usageLimits: '25MB/file free',
          watermarks: 'No',
          worksOffline: 'No',
          bulkProcessing: 'Yes',
          processingSpeed: 'Fast (server)',
          fileSizeLimit: '100MB max'
        }
      },
      {
        name: 'Adobe Acrobat',
        features: {
          price: '$12.99/month',
          privacy: 'Cloud upload required',
          accountRequired: 'Yes',
          usageLimits: 'Unlimited',
          watermarks: 'No',
          worksOffline: 'Yes',
          bulkProcessing: 'Yes',
          processingSpeed: 'Fast (native)',
          fileSizeLimit: 'No limit'
        }
      }
    ]
  },
  'image-compress': {
    competitors: [
      {
        name: 'TinyPNG',
        features: {
          price: '$39/year',
          privacy: 'Cloud upload required',
          accountRequired: 'No (free)',
          usageLimits: '20 images/month free',
          watermarks: 'No',
          worksOffline: 'No',
          bulkProcessing: 'Yes (paid)',
          processingSpeed: 'Fast (server)',
          fileSizeLimit: '5MB per image'
        }
      },
      {
        name: 'ImageOptim',
        features: {
          price: '$15 (one-time)',
          privacy: 'Local processing (Mac only)',
          accountRequired: 'No',
          usageLimits: 'Unlimited',
          watermarks: 'No',
          worksOffline: 'Yes',
          bulkProcessing: 'Yes',
          processingSpeed: 'Medium (local)',
          fileSizeLimit: 'No limit'
        }
      },
      {
        name: 'Squoosh',
        features: {
          price: 'Free',
          privacy: 'Browser-based',
          accountRequired: 'No',
          usageLimits: '1 image at a time',
          watermarks: 'No',
          worksOffline: 'Yes',
          bulkProcessing: 'No',
          processingSpeed: 'Medium (browser)',
          fileSizeLimit: 'No limit'
        }
      }
    ]
  },
  'video-compressor': {
    competitors: [
      {
        name: 'HandBrake',
        features: {
          price: 'Free (open source)',
          privacy: 'Local processing',
          accountRequired: 'No',
          usageLimits: 'Unlimited',
          watermarks: 'No',
          worksOffline: 'Yes',
          bulkProcessing: 'Yes',
          processingSpeed: 'Slow (CPU-dependent)',
          fileSizeLimit: 'No limit'
        }
      },
      {
        name: 'Adobe Premiere',
        features: {
          price: '$20.99/month',
          privacy: 'Local processing',
          accountRequired: 'Yes',
          usageLimits: 'Unlimited',
          watermarks: 'No',
          worksOffline: 'Yes',
          bulkProcessing: 'Yes',
          processingSpeed: 'Fast (GPU-accelerated)',
          fileSizeLimit: 'No limit'
        }
      },
      {
        name: 'CloudConvert',
        features: {
          price: '$9/month',
          privacy: 'Cloud upload required',
          accountRequired: 'Yes',
          usageLimits: '25 minutes/day free',
          watermarks: 'No',
          worksOffline: 'No',
          bulkProcessing: 'Yes',
          processingSpeed: 'Fast (server)',
          fileSizeLimit: '1GB max'
        }
      }
    ]
  },
  'background-remover': {
    competitors: [
      {
        name: 'Remove.bg',
        features: {
          price: '$0.23/image',
          privacy: 'Cloud upload required',
          accountRequired: 'Yes',
          usageLimits: '1 free credit',
          watermarks: 'No',
          worksOffline: 'No',
          bulkProcessing: 'Yes',
          processingSpeed: 'Fast (server)',
          fileSizeLimit: '12MB max'
        }
      },
      {
        name: 'Photoshop',
        features: {
          price: '$20.99/month',
          privacy: 'Local processing',
          accountRequired: 'Yes',
          usageLimits: 'Unlimited',
          watermarks: 'No',
          worksOffline: 'Yes',
          bulkProcessing: 'Manual',
          processingSpeed: 'Manual (fast with skill)',
          fileSizeLimit: 'No limit'
        }
      },
      {
        name: 'Canva Pro',
        features: {
          price: '$12.99/month',
          privacy: 'Cloud upload required',
          accountRequired: 'Yes',
          usageLimits: 'Unlimited (with Pro)',
          watermarks: 'No',
          worksOffline: 'Limited',
          bulkProcessing: 'Yes',
          processingSpeed: 'Fast (server)',
          fileSizeLimit: '25MB'
        }
      }
    ]
  },
  'audio-transcription': {
    competitors: [
      {
        name: 'Otter.ai',
        features: {
          price: '$8.33/month',
          privacy: 'Cloud upload required',
          accountRequired: 'Yes',
          usageLimits: '300 minutes/month free',
          watermarks: 'No',
          worksOffline: 'No',
          bulkProcessing: 'Yes',
          processingSpeed: 'Fast (server)',
          fileSizeLimit: 'No limit'
        }
      },
      {
        name: 'Rev',
        features: {
          price: '$1.50/minute',
          privacy: 'Human service (cloud)',
          accountRequired: 'Yes',
          usageLimits: 'Pay per minute',
          watermarks: 'No',
          worksOffline: 'No',
          bulkProcessing: 'Yes',
          processingSpeed: '24-hour turnaround',
          fileSizeLimit: '5GB max'
        }
      },
      {
        name: 'Descript',
        features: {
          price: '$12/month',
          privacy: 'Cloud upload required',
          accountRequired: 'Yes',
          usageLimits: '10 hours/month free',
          watermarks: 'No',
          worksOffline: 'No',
          bulkProcessing: 'Yes',
          processingSpeed: 'Fast (server)',
          fileSizeLimit: '4GB max'
        }
      }
    ]
  }
};

export type ToolId = keyof typeof competitorData;

export const getCompetitorData = (toolId: string) => {
  return competitorData[toolId as ToolId];
};
