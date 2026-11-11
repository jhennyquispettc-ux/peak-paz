export interface DetectedFileType {
  extension: string;
  mimetype: string;
}

const SIGNATURES: { bytes: number[]; type: DetectedFileType }[] = [
  {
    bytes: [0x25, 0x50, 0x44, 0x46, 0x2d],
    type: { extension: 'pdf', mimetype: 'application/pdf' },
  },
  {
    bytes: [0xff, 0xd8, 0xff],
    type: { extension: 'jpg', mimetype: 'image/jpeg' },
  },
  {
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    type: { extension: 'png', mimetype: 'image/png' },
  },
];

const MIMETYPES_BY_EXTENSION = new Map(
  SIGNATURES.map(({ type }) => [type.extension, type.mimetype]),
);

export function detectDocumentType(buffer: Buffer): DetectedFileType | null {
  const match = SIGNATURES.find(({ bytes }) =>
    bytes.every((byte, index) => buffer[index] === byte),
  );
  return match?.type ?? null;
}

export function mimetypeForExtension(extension: string): string {
  return MIMETYPES_BY_EXTENSION.get(extension) ?? 'application/octet-stream';
}
