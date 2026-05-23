const MockMapView = jest.fn(() => null)
MockMapView.Marker = jest.fn(() => null)
MockMapView.Polyline = jest.fn(() => null)
MockMapView.Circle = jest.fn(() => null)

module.exports = {
  default: MockMapView,
  Marker: MockMapView.Marker,
  Polyline: MockMapView.Polyline,
  Circle: MockMapView.Circle,
}
