import { detectDocumentType, mimetypeForExtension } from './file-signature.js';

describe('detectDocumentType', () => {
  it('recognizes PDF, JPG and PNG by their first bytes', () => {
    expect(detectDocumentType(Buffer.from('%PDF-1.7 rest'))).toEqual({
      extension: 'pdf',
      mimetype: 'application/pdf',
    });
    expect(
      detectDocumentType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])),
    ).toMatchObject({ extension: 'jpg' });
    expect(
      detectDocumentType(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      ),
    ).toMatchObject({ extension: 'png' });
  });

  it('rejects any other content even with a misleading name', () => {
    expect(detectDocumentType(Buffer.from('<html>fake.pdf</html>'))).toBeNull();
    expect(detectDocumentType(Buffer.alloc(0))).toBeNull();
  });

  it('maps extensions back to their media type', () => {
    expect(mimetypeForExtension('png')).toBe('image/png');
    expect(mimetypeForExtension('exe')).toBe('application/octet-stream');
  });
});
