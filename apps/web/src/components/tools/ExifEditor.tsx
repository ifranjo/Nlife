import { useState, useCallback, useRef } from 'react';
import {
  validateFile,
  sanitizeFilename,
  createSafeErrorMessage,
} from '../../lib/security';

// EXIF Tag Names for display
const EXIF_TAG_NAMES: Record<string, string> = {
  // Image Info
  ImageWidth: 'Image Width',
  ImageLength: 'Image Height',
  BitsPerSample: 'Bits Per Sample',
  Compression: 'Compression',
  PhotometricInterpretation: 'Color Mode',
  Orientation: 'Orientation',
  SamplesPerPixel: 'Samples Per Pixel',
  XResolution: 'X Resolution',
  YResolution: 'Y Resolution',
  ResolutionUnit: 'Resolution Unit',
  Software: 'Software',
  DateTime: 'Date/Time Modified',
  Artist: 'Artist',
  Copyright: 'Copyright',
  ImageDescription: 'Description',

  // EXIF Info
  ExifVersion: 'EXIF Version',
  DateTimeOriginal: 'Date Taken',
  DateTimeDigitized: 'Date Digitized',
  ComponentsConfiguration: 'Components Config',
  CompressedBitsPerPixel: 'Compressed BPP',
  ShutterSpeedValue: 'Shutter Speed',
  ApertureValue: 'Aperture',
  BrightnessValue: 'Brightness',
  ExposureBiasValue: 'Exposure Bias',
  MaxApertureValue: 'Max Aperture',
  MeteringMode: 'Metering Mode',
  Flash: 'Flash',
  FocalLength: 'Focal Length',
  FocalLengthIn35mmFilm: 'Focal Length (35mm)',
  ColorSpace: 'Color Space',
  PixelXDimension: 'Pixel Width',
  PixelYDimension: 'Pixel Height',
  ExposureMode: 'Exposure Mode',
  WhiteBalance: 'White Balance',
  SceneCaptureType: 'Scene Type',
  Make: 'Camera Make',
  Model: 'Camera Model',
  ExposureTime: 'Exposure Time',
  FNumber: 'F-Number',
  ISOSpeedRatings: 'ISO',
  LensMake: 'Lens Make',
  LensModel: 'Lens Model',

  // GPS Info
  GPSLatitude: 'GPS Latitude',
  GPSLatitudeRef: 'GPS Latitude Ref',
  GPSLongitude: 'GPS Longitude',
  GPSLongitudeRef: 'GPS Longitude Ref',
  GPSAltitude: 'GPS Altitude',
  GPSAltitudeRef: 'GPS Altitude Ref',
  GPSTimeStamp: 'GPS Time',
  GPSDateStamp: 'GPS Date',
  GPSVersionID: 'GPS Version',
};

// GPS related tags to strip
const GPS_TAGS = [
  'GPSLatitude', 'GPSLatitudeRef', 'GPSLongitude', 'GPSLongitudeRef',
  'GPSAltitude', 'GPSAltitudeRef', 'GPSTimeStamp', 'GPSDateStamp',
  'GPSVersionID', 'GPSProcessingMethod', 'GPSAreaInformation',
  'GPSMapDatum', 'GPSDestLatitude', 'GPSDestLatitudeRef',
  'GPSDestLongitude', 'GPSDestLongitudeRef', 'GPSDestBearing',
  'GPSDestBearingRef', 'GPSDestDistance', 'GPSDestDistanceRef',
  'GPSImgDirection', 'GPSImgDirectionRef', 'GPSSpeed', 'GPSSpeedRef',
  'GPSTrack', 'GPSTrackRef', 'GPSSatellites', 'GPSStatus', 'GPSMeasureMode',
  'GPSDOP', 'GPSDifferential'
];

interface ExifData {
  '0th': Record<number, unknown>;
  Exif: Record<number, unknown>;
  GPS: Record<number, unknown>;
  Interop: Record<number, unknown>;
  '1st': Record<number, unknown>;
  thumbnail?: string;
}

interface MetadataItem {
  key: string;
  displayName: string;
  value: string;
  category: 'image' | 'camera' | 'gps' | 'other';
  isGps: boolean;
}

interface EditableFields {
  DateTime: string;
  Artist: string;
  Copyright: string;
  ImageDescription: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ExifEditor() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MetadataItem[]>([]);
  const [rawExifData, setRawExifData] = useState<ExifData | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [cleanedBlob, setCleanedBlob] = useState<Blob | null>(null);
  const [cleanedSize, setCleanedSize] = useState<number | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editableFields, setEditableFields] = useState<EditableFields>({
    DateTime: '',
    Artist: '',
    Copyright: '',
    ImageDescription: '',
  });

  const [hasGps, setHasGps] = useState(false);
  const [gpsStripped, setGpsStripped] = useState(false);
  const [allStripped, setAllStripped] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatExifValue = (key: string, value: unknown): string => {
    if (value === undefined || value === null) return 'N/A';

    // Handle arrays (like GPS coordinates)
    if (Array.isArray(value)) {
      if (key.includes('GPS') && (key.includes('Latitude') || key.includes('Longitude'))) {
        // GPS coordinates are stored as [[deg,1], [min,1], [sec,100]]
        try {
          if (value.length >= 3 && Array.isArray(value[0]) && Array.isArray(value[1]) && Array.isArray(value[2])) {
            const degrees = (value[0] as number[])[0] / (value[0] as number[])[1];
            const minutes = (value[1] as number[])[0] / (value[1] as number[])[1];
            const seconds = (value[2] as number[])[0] / (value[2] as number[])[1];
            return `${degrees.toFixed(0)}° ${minutes.toFixed(0)}' ${seconds.toFixed(2)}"`;
          }
          return value.toString();
        } catch {
          return value.toString();
        }
      }
      return value.join(', ');
    }

    // Handle rational numbers (stored as [numerator, denominator])
    if (typeof value === 'object' && value !== null && 'numerator' in value && 'denominator' in value) {
      const num = (value as { numerator: number; denominator: number }).numerator;
      const den = (value as { numerator: number; denominator: number }).denominator;
      if (den === 1) return num.toString();
      return (num / den).toFixed(2);
    }

    // Orientation values
    if (key === 'Orientation') {
      const orientations: Record<number, string> = {
        1: 'Normal', 2: 'Mirrored', 3: 'Rotated 180°',
        4: 'Mirrored + 180°', 5: 'Mirrored + 270° CW',
        6: 'Rotated 90° CW', 7: 'Mirrored + 90° CW', 8: 'Rotated 270° CW'
      };
      return orientations[value as number] || value.toString();
    }

    // Flash values
    if (key === 'Flash') {
      return (value as number) & 1 ? 'Fired' : 'Did not fire';
    }

    return String(value);
  };

  const categorizeTag = (key: string): MetadataItem['category'] => {
    if (key.startsWith('GPS')) return 'gps';
    if (['Make', 'Model', 'LensMake', 'LensModel', 'FocalLength', 'FNumber',
         'ExposureTime', 'ISOSpeedRatings', 'ShutterSpeedValue', 'ApertureValue',
         'Flash', 'MeteringMode', 'WhiteBalance', 'ExposureMode'].includes(key)) {
      return 'camera';
    }
    if (['ImageWidth', 'ImageLength', 'PixelXDimension', 'PixelYDimension',
         'XResolution', 'YResolution', 'ColorSpace', 'Orientation'].includes(key)) {
      return 'image';
    }
    return 'other';
  };

  // Dynamically import piexifjs
  const loadPiexif = async () => {
    const piexif = await import('piexifjs');
    return piexif.default || piexif;
  };

  const parseExifData = async (dataUrl: string): Promise<{ metadata: MetadataItem[]; rawData: ExifData | null }> => {
    try {
      const piexif = await loadPiexif();
      const exifObj = piexif.load(dataUrl) as ExifData;

      const items: MetadataItem[] = [];

      // Helper to process EXIF IFD
      const processIfd = (ifd: Record<number, unknown>, tagNames: Record<number, string>) => {
        for (const [tagId, value] of Object.entries(ifd)) {
          const tagName = tagNames[parseInt(tagId)];
          if (tagName && value !== undefined) {
            const displayName = EXIF_TAG_NAMES[tagName] || tagName;
            items.push({
              key: tagName,
              displayName,
              value: formatExifValue(tagName, value),
              category: categorizeTag(tagName),
              isGps: tagName.startsWith('GPS'),
            });
          }
        }
      };

      // Process each IFD
      if (exifObj['0th']) processIfd(exifObj['0th'], piexif.TAGS.Image);
      if (exifObj.Exif) processIfd(exifObj.Exif, piexif.TAGS.Exif);
      if (exifObj.GPS) processIfd(exifObj.GPS, piexif.TAGS.GPS);

      return { metadata: items, rawData: exifObj };
    } catch (err) {
      console.error('EXIF parse error:', err);
      return { metadata: [], rawData: null };
    }
  };

  const loadImage = async (file: File) => {
    setError(null);
    setSuccess(null);
    setCleanedBlob(null);
    setCleanedSize(null);
    setGpsStripped(false);
    setAllStripped(false);

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 10MB limit`);
      return;
    }

    const validation = await validateFile(file, 'image');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Only support JPEG for EXIF editing
    if (!file.type.includes('jpeg') && !file.name.toLowerCase().endsWith('.jpg') && !file.name.toLowerCase().endsWith('.jpeg')) {
      setError('EXIF editing only supports JPEG images. PNG and other formats do not store EXIF data.');
      return;
    }

    setImageFile(file);
    setOriginalSize(file.size);

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImageSrc(dataUrl);

      // Parse EXIF data
      const { metadata: items, rawData } = await parseExifData(dataUrl);
      setMetadata(items);
      setRawExifData(rawData);

      // Check for GPS data
      const hasGpsData = items.some(item => item.isGps);
      setHasGps(hasGpsData);

      // Extract editable fields
      const findValue = (key: string) => items.find(i => i.key === key)?.value || '';
      setEditableFields({
        DateTime: findValue('DateTime') || findValue('DateTimeOriginal'),
        Artist: findValue('Artist'),
        Copyright: findValue('Copyright'),
        ImageDescription: findValue('ImageDescription'),
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      void loadImage(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void loadImage(e.target.files[0]);
    }
  };

  const stripGpsData = async () => {
    if (!imageSrc || !rawExifData) return;

    setIsProcessing(true);
    setError(null);

    try {
      const piexif = await loadPiexif();

      // Create copy of EXIF data without GPS
      const newExifObj = { ...rawExifData };
      newExifObj.GPS = {};

      // Insert modified EXIF back into image
      const exifBytes = piexif.dump(newExifObj);
      const newDataUrl = piexif.insert(exifBytes, imageSrc);

      // Convert to blob
      const response = await fetch(newDataUrl);
      const blob = await response.blob();

      setCleanedBlob(blob);
      setCleanedSize(blob.size);
      setGpsStripped(true);
      setSuccess('GPS location data has been removed! Your photo is now safer to share.');

      // Update metadata display
      setMetadata(prev => prev.filter(item => !item.isGps));
      setHasGps(false);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to strip GPS data'));
    } finally {
      setIsProcessing(false);
    }
  };

  const stripAllMetadata = async () => {
    if (!imageSrc) return;

    setIsProcessing(true);
    setError(null);

    try {
      const piexif = await loadPiexif();

      // Remove all EXIF data
      const newDataUrl = piexif.remove(imageSrc);

      // Convert to blob
      const response = await fetch(newDataUrl);
      const blob = await response.blob();

      setCleanedBlob(blob);
      setCleanedSize(blob.size);
      setAllStripped(true);
      setGpsStripped(true);
      setSuccess('All metadata has been removed! Image is now completely clean.');

      // Clear metadata display
      setMetadata([]);
      setHasGps(false);
      setRawExifData(null);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to strip metadata'));
    } finally {
      setIsProcessing(false);
    }
  };

  const saveEditedMetadata = async () => {
    if (!imageSrc || !rawExifData) return;

    setIsProcessing(true);
    setError(null);

    try {
      const piexif = await loadPiexif();

      // Update EXIF data with edited fields
      const newExifObj = { ...rawExifData };

      // Update 0th IFD (Image IFD)
      if (!newExifObj['0th']) newExifObj['0th'] = {};

      // Find tag IDs for the fields we want to edit
      const imageTagIds: Record<string, number> = {};
      for (const [id, name] of Object.entries(piexif.TAGS.Image)) {
        imageTagIds[name as string] = parseInt(id);
      }

      if (editableFields.DateTime) {
        // Format: YYYY:MM:DD HH:MM:SS
        newExifObj['0th'][imageTagIds.DateTime] = editableFields.DateTime;
      }
      if (editableFields.Artist) {
        newExifObj['0th'][imageTagIds.Artist] = editableFields.Artist;
      }
      if (editableFields.Copyright) {
        newExifObj['0th'][imageTagIds.Copyright] = editableFields.Copyright;
      }
      if (editableFields.ImageDescription) {
        newExifObj['0th'][imageTagIds.ImageDescription] = editableFields.ImageDescription;
      }

      // Insert modified EXIF back into image
      const exifBytes = piexif.dump(newExifObj);
      const newDataUrl = piexif.insert(exifBytes, imageSrc);

      // Convert to blob
      const response = await fetch(newDataUrl);
      const blob = await response.blob();

      setCleanedBlob(blob);
      setCleanedSize(blob.size);
      setSuccess('Metadata has been updated successfully!');

      // Refresh metadata display
      const { metadata: items, rawData } = await parseExifData(newDataUrl);
      setMetadata(items);
      setRawExifData(rawData);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to save metadata'));
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    const blobToDownload = cleanedBlob || (imageSrc ? null : null);

    if (!blobToDownload && imageSrc) {
      // If no modifications made, download original with any edits
      const link = document.createElement('a');
      link.href = imageSrc;
      link.download = sanitizeFilename(imageFile?.name || 'image') + '_edited.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (!blobToDownload) return;

    const url = URL.createObjectURL(blobToDownload);
    const link = document.createElement('a');
    link.href = url;

    const baseName = sanitizeFilename(imageFile?.name || 'image').replace(/\.[^.]+$/, '');
    const suffix = allStripped ? '_cleaned' : gpsStripped ? '_no_gps' : '_edited';
    link.download = `${baseName}${suffix}.jpg`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearImage = () => {
    setImageFile(null);
    setImageSrc(null);
    setMetadata([]);
    setRawExifData(null);
    setOriginalSize(0);
    setCleanedBlob(null);
    setCleanedSize(null);
    setError(null);
    setSuccess(null);
    setHasGps(false);
    setGpsStripped(false);
    setAllStripped(false);
    setEditableFields({
      DateTime: '',
      Artist: '',
      Copyright: '',
      ImageDescription: '',
    });
  };

  const groupedMetadata = {
    image: metadata.filter(m => m.category === 'image'),
    camera: metadata.filter(m => m.category === 'camera'),
    gps: metadata.filter(m => m.category === 'gps'),
    other: metadata.filter(m => m.category === 'other'),
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Drop Zone */}
      {!imageFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            drop-zone rounded-2xl p-12 text-center cursor-pointer
            ${isDragging ? 'drag-over' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="text-5xl mb-4">
            <svg className="w-16 h-16 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Drop a JPEG image here or click to browse
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            View and edit EXIF metadata, strip GPS location for privacy
          </p>
          <p className="text-slate-400 text-xs">
            JPEG images only (PNG and other formats don't store EXIF data). Max 10MB.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mt-4 p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm">
          {success}
        </div>
      )}

      {/* Image Preview & Actions */}
      {imageFile && imageSrc && (
        <>
          {/* Image Preview */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-start gap-6">
              {/* Thumbnail */}
              <div className="w-48 h-48 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                <img
                  src={imageSrc}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* File Info */}
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white mb-2">
                  {sanitizeFilename(imageFile.name)}
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Original size:</span>
                    <span className="text-white">{formatFileSize(originalSize)}</span>
                  </div>

                  {cleanedSize !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">After cleaning:</span>
                      <span className="text-white">{formatFileSize(cleanedSize)}</span>
                      <span className={cleanedSize < originalSize ? 'text-green-400' : 'text-yellow-400'}>
                        ({cleanedSize < originalSize ? '-' : '+'}{Math.abs(((cleanedSize - originalSize) / originalSize) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Metadata fields:</span>
                    <span className="text-white">{metadata.length}</span>
                  </div>

                  {/* GPS Warning */}
                  {hasGps && !gpsStripped && (
                    <div className="mt-3 p-3 rounded-lg bg-red-500/20 border border-red-500/40">
                      <div className="flex items-center gap-2 text-red-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium">GPS Location Detected!</span>
                      </div>
                      <p className="text-red-300/80 text-xs mt-1">
                        This photo contains your exact location. Strip GPS data before sharing online!
                      </p>
                    </div>
                  )}

                  {gpsStripped && (
                    <div className="mt-3 p-3 rounded-lg bg-green-500/20 border border-green-500/40">
                      <div className="flex items-center gap-2 text-green-300">
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">GPS Data Removed</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mt-4">
                  {hasGps && !gpsStripped && (
                    <button
                      onClick={stripGpsData}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Strip GPS Location
                    </button>
                  )}

                  {!allStripped && (
                    <button
                      onClick={stripAllMetadata}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Strip ALL Metadata
                    </button>
                  )}

                  {(cleanedBlob || metadata.length > 0) && (
                    <button
                      onClick={downloadImage}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  )}

                  <button
                    onClick={clearImage}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Fields */}
          {!allStripped && metadata.length > 0 && (
            <div className="glass-card p-6 mb-6">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Metadata
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Date/Time</label>
                  <input
                    type="text"
                    value={editableFields.DateTime}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, DateTime: e.target.value }))}
                    placeholder="YYYY:MM:DD HH:MM:SS"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1">Artist / Author</label>
                  <input
                    type="text"
                    value={editableFields.Artist}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, Artist: e.target.value }))}
                    placeholder="Photographer name"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1">Copyright</label>
                  <input
                    type="text"
                    value={editableFields.Copyright}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, Copyright: e.target.value }))}
                    placeholder="Copyright notice"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1">Description</label>
                  <input
                    type="text"
                    value={editableFields.ImageDescription}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, ImageDescription: e.target.value }))}
                    placeholder="Image description"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <button
                onClick={saveEditedMetadata}
                disabled={isProcessing}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}

          {/* Metadata Display */}
          {metadata.length > 0 && (
            <div className="glass-card p-6">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                EXIF Metadata ({metadata.length} fields)
              </h4>

              <div className="space-y-6">
                {/* GPS Section - with warning */}
                {groupedMetadata.gps.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      GPS Location (Privacy Risk!)
                    </h5>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {groupedMetadata.gps.map((item) => (
                          <div key={item.key} className="text-sm">
                            <span className="text-red-300/80">{item.displayName}:</span>
                            <span className="text-red-200 ml-2">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Camera Info */}
                {groupedMetadata.camera.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Camera Settings
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      {groupedMetadata.camera.map((item) => (
                        <div key={item.key} className="text-sm">
                          <span className="text-slate-400">{item.displayName}:</span>
                          <span className="text-slate-300 ml-2">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Info */}
                {groupedMetadata.image.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Image Properties
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      {groupedMetadata.image.map((item) => (
                        <div key={item.key} className="text-sm">
                          <span className="text-slate-400">{item.displayName}:</span>
                          <span className="text-slate-300 ml-2">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Info */}
                {groupedMetadata.other.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-slate-300 mb-2">Other Information</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {groupedMetadata.other.map((item) => (
                        <div key={item.key} className="text-sm">
                          <span className="text-slate-400">{item.displayName}:</span>
                          <span className="text-slate-300 ml-2">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty metadata state */}
          {metadata.length === 0 && allStripped && (
            <div className="glass-card p-6 text-center">
              <svg className="w-12 h-12 mx-auto text-green-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-white font-medium">All metadata has been removed</p>
              <p className="text-slate-400 text-sm mt-1">This image is now clean and safe to share</p>
            </div>
          )}
        </>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-slate-400 text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your images never leave your browser. All processing happens locally.
      </p>
    </div>
  );
}
