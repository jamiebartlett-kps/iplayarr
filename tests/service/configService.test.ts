import searchFacade from '../../server/facade/searchFacade';
import configService from '../../server/service/configService';
import { IplayarrParameter } from '../../server/types/IplayarrParameters';

jest.mock('../../server/facade/searchFacade', () => ({
  clearSearchCache: jest.fn(),
}));

describe('configService', () => {
  it('returns parameter from stored config', async () => {
    await configService.setParameter(IplayarrParameter.DEBUG, 'true');
    const result = await configService.getParameter(IplayarrParameter.DEBUG);
    expect(result).toBe('true');
  });

  it('returns parameter from env', async () => {
    process.env[IplayarrParameter.RSS_FEED_HOURS] = '99';
    const result = await configService.getParameter(IplayarrParameter.RSS_FEED_HOURS);
    expect(result).toBe('99');
    delete process.env[IplayarrParameter.RSS_FEED_HOURS];
  });

  it('returns parameter from default config', async () => {
    const result = await configService.getParameter(IplayarrParameter.ACTIVE_LIMIT);
    expect(result).toBe('3');
  });

  it('returns multiple parameters', async () => {
    const [debug, quality] = await configService.getParameters(IplayarrParameter.DEBUG, IplayarrParameter.VIDEO_QUALITY);
    expect(debug).toBe('false');
    expect(quality).toBe('hd');
  });

  it('sets and gets parameter', async () => {
    await configService.setParameter(IplayarrParameter.DEBUG, 'true');
    const value = await configService.getParameter(IplayarrParameter.DEBUG);
    expect(value).toBe('true');
  });

  it('removes parameter', async () => {
    await configService.setParameter(IplayarrParameter.DEBUG, 'true');
    await configService.removeParameter(IplayarrParameter.DEBUG);
    const value = await configService.getParameter(IplayarrParameter.DEBUG);
    expect(value).toBe('false'); // falls back to default
  });

  it('clears search cache when NATIVE_SEARCH changes', async () => {
    await configService.setParameter(IplayarrParameter.NATIVE_SEARCH, 'false');
    jest.clearAllMocks();
    await configService.setParameter(IplayarrParameter.NATIVE_SEARCH, 'true');
    expect(searchFacade.clearSearchCache).toHaveBeenCalled();
  });

  it('does not clear search cache when NATIVE_SEARCH is unchanged', async () => {
    await configService.setParameter(IplayarrParameter.NATIVE_SEARCH, 'true');
    jest.clearAllMocks();
    await configService.setParameter(IplayarrParameter.NATIVE_SEARCH, 'true');
    expect(searchFacade.clearSearchCache).not.toHaveBeenCalled();
  });

  it('getAllConfig returns merged config map', async () => {
    await configService.setParameter(IplayarrParameter.DEBUG, 'true');
    const config = await configService.getAllConfig();
    expect(config.DEBUG).toBe('true');
    expect(config.REFRESH_SCHEDULE).toBe('0 * * * *');
  });
});
