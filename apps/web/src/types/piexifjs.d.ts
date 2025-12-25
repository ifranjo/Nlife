declare module 'piexifjs' {
  interface ExifData {
    '0th': Record<number, unknown>;
    Exif: Record<number, unknown>;
    GPS: Record<number, unknown>;
    Interop: Record<number, unknown>;
    '1st': Record<number, unknown>;
    thumbnail?: string;
  }

  interface Tags {
    Image: Record<number, string>;
    Exif: Record<number, string>;
    GPS: Record<number, string>;
    Interop: Record<number, string>;
  }

  interface Piexif {
    load(dataUrl: string): ExifData;
    dump(exifData: ExifData): string;
    insert(exifBytes: string, dataUrl: string): string;
    remove(dataUrl: string): string;
    TAGS: Tags;
  }

  const piexif: Piexif;
  export = piexif;
  export default piexif;
}
