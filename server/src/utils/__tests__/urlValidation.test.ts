const mockGetConfig = jest.fn()

jest.mock('../../services/container', () => ({
  getConfig: () => mockGetConfig(),
}))

function isSafeImageUrlWithConnectionString(url: string, connectionString: string): boolean {
  jest.resetModules()
  mockGetConfig.mockReturnValue({
    azureStorage: {
      connectionString,
      containerName: 'crabwatch-uploads',
    },
  })

  let validator: typeof import('../urlValidation').isSafeImageUrl
  jest.isolateModules(() => {
    validator = require('../urlValidation').isSafeImageUrl
  })
  return validator!(url)
}

describe('isSafeImageUrl', () => {
  it('allows the configured account URL from a standard Azure connection string', () => {
    const connectionString =
      'DefaultEndpointsProtocol=https;AccountName=crabwatch04052026;AccountKey=key;EndpointSuffix=core.windows.net'

    expect(
      isSafeImageUrlWithConnectionString(
        'https://crabwatch04052026.blob.core.windows.net/crabwatch-uploads/analysis/photo.jpg?sig=token',
        connectionString,
      ),
    ).toBe(true)
  })

  it('keeps other storage accounts and containers blocked', () => {
    const connectionString =
      'DefaultEndpointsProtocol=https;AccountName=crabwatch04052026;AccountKey=key;EndpointSuffix=core.windows.net'

    expect(
      isSafeImageUrlWithConnectionString(
        'https://otheraccount.blob.core.windows.net/crabwatch-uploads/analysis/photo.jpg',
        connectionString,
      ),
    ).toBe(false)
    expect(
      isSafeImageUrlWithConnectionString(
        'https://crabwatch04052026.blob.core.windows.net/other-container/photo.jpg',
        connectionString,
      ),
    ).toBe(false)
  })

  it('continues to honor an explicit BlobEndpoint', () => {
    const connectionString =
      'DefaultEndpointsProtocol=https;AccountName=local;AccountKey=key;BlobEndpoint=http://127.0.0.1:10000/local'

    expect(
      isSafeImageUrlWithConnectionString(
        'http://127.0.0.1:10000/local/crabwatch-uploads/analysis/photo.jpg',
        connectionString,
      ),
    ).toBe(true)
  })
})