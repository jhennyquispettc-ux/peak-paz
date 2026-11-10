import { InvalidGpxException } from '../exceptions/routes.exceptions.js';
import { GpxService, haversineKm } from './gpx.service.js';

function gpx(body: string): Buffer {
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">${body}</gpx>`,
  );
}

describe('GpxService', () => {
  const service = new GpxService();

  it('measures one degree of latitude as about 111 km', () => {
    expect(haversineKm([-68, -16], [-68, -17])).toBeCloseTo(111.19, 1);
  });

  it('reads a track and computes distance and elevation', () => {
    const { track, summary } = service.parse(
      gpx(`<trk><trkseg>
        <trkpt lat="-16.300000" lon="-68.000000"><ele>4700</ele></trkpt>
        <trkpt lat="-16.305000" lon="-68.000000"><ele>4702</ele></trkpt>
        <trkpt lat="-16.310000" lon="-68.000000"><ele>4760</ele></trkpt>
        <trkpt lat="-16.320000" lon="-68.000000"><ele>4600</ele></trkpt>
      </trkseg></trk>`),
    );

    expect(track.type).toBe('LineString');
    expect(track.coordinates[0]).toEqual([-68, -16.3, 4700]);
    expect(summary.points).toBe(4);
    expect(summary.distanceKm).toBeCloseTo(2.2, 1);
    expect(summary.elevationGainM).toBe(60);
    expect(summary.elevationLossM).toBe(160);
    expect(summary.maxAltitudeM).toBe(4760);
  });

  it('falls back to route points when there is no track', () => {
    const { summary } = service.parse(
      gpx(`<rte>
        <rtept lat="-16.30" lon="-68.00"></rtept>
        <rtept lat="-16.31" lon="-68.00"></rtept>
      </rte>`),
    );
    expect(summary.points).toBe(2);
    expect(summary.maxAltitudeM).toBeNull();
  });

  it('rejects content that is not GPX', () => {
    expect(() => service.parse(Buffer.from('not xml at all <'))).toThrow(
      InvalidGpxException,
    );
    expect(() => service.parse(Buffer.from('<kml></kml>'))).toThrow(
      InvalidGpxException,
    );
  });

  it('rejects a track with fewer than two points', () => {
    expect(() =>
      service.parse(
        gpx(
          '<trk><trkseg><trkpt lat="-16.3" lon="-68"></trkpt></trkseg></trk>',
        ),
      ),
    ).toThrow(InvalidGpxException);
  });
});
