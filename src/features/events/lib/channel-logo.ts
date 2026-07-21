import type { ImageSourcePropType } from 'react-native';

/**
 * Locally-bundled broadcaster logos, keyed by the channel's display name (as
 * stored in the `channels` table). Assets are white-flattened so they read on
 * a light chip in both light and dark mode. Channels without a bundled logo
 * fall back to a generic TV icon in the UI.
 */
const CHANNEL_LOGOS: Record<string, ImageSourcePropType> = {
  ABC: require('../../../../assets/channels/abc.png'),
  BBC: require('../../../../assets/channels/bbc.png'),
  'CBS / Paramount+': require('../../../../assets/channels/cbs-paramount.png'),
  'Canal+': require('../../../../assets/channels/canal.png'),
  'Channel 4': require('../../../../assets/channels/channel-4.png'),
  DAZN: require('../../../../assets/channels/dazn.png'),
  'DAZN España': require('../../../../assets/channels/dazn-espana.png'),
  'DAZN Italia': require('../../../../assets/channels/dazn-italia.png'),
  'DAZN Portugal': require('../../../../assets/channels/dazn-portugal.png'),
  ESPN: require('../../../../assets/channels/espn.png'),
  'ESPN NL': require('../../../../assets/channels/espn-nl.png'),
  'ESPN+': require('../../../../assets/channels/espn.png'),
  'Eleven Sports PT': require('../../../../assets/channels/eleven-sports-pt.png'),
  'Eurosport España': require('../../../../assets/channels/eurosport-espana.png'),
  'Eurosport France': require('../../../../assets/channels/eurosport-france.png'),
  Exxen: require('../../../../assets/channels/exxen.png'),
  'FOX Sports': require('../../../../assets/channels/fox-sports.png'),
  'HBO Max': require('../../../../assets/channels/hbo-max.png'),
  'Movistar Plus+': require('../../../../assets/channels/movistar-plus.png'),
  'NBC / Peacock': require('../../../../assets/channels/nbc-peacock.png'),
  'Premier Sports': require('../../../../assets/channels/premier-sports.png'),
  'RMC Sport': require('../../../../assets/channels/rmc-sport.png'),
  RTL: require('../../../../assets/channels/rtl.png'),
  'S Sport': require('../../../../assets/channels/s-sport.png'),
  'S Sport Plus': require('../../../../assets/channels/s-sport-plus.png'),
  'ServusTV On': require('../../../../assets/channels/servustv-on.png'),
  'Sky Sport': require('../../../../assets/channels/sky-sport.png'),
  'Sky Sport Italia': require('../../../../assets/channels/sky-sport-italia.png'),
  'Sky Sports': require('../../../../assets/channels/sky-sports.png'),
  'TABİİ Spor': require('../../../../assets/channels/tabii-spor.png'),
  'TNT Sports': require('../../../../assets/channels/tnt-sports.png'),
  'TRT 1': require('../../../../assets/channels/trt-1.png'),
  'TRT Spor': require('../../../../assets/channels/trt-spor.png'),
  'TRT Spor Yıldız': require('../../../../assets/channels/trt-spor-yildiz.png'),
  'Tennis Channel': require('../../../../assets/channels/tennis-channel.png'),
  'Tivibu Spor': require('../../../../assets/channels/tivibu-spor.png'),
  TV8: require('../../../../assets/channels/tv8.png'),
  'TV8,5': require('../../../../assets/channels/tv8-5.png'),
  Viaplay: require('../../../../assets/channels/viaplay.png'),
  'Ziggo Sport': require('../../../../assets/channels/ziggo-sport.png'),
  'beIN Sports': require('../../../../assets/channels/bein-sports.png'),
  'beIN Sports France': require('../../../../assets/channels/bein-sports-france.png'),
};

/** Bundled logo for a channel by its display name, or null if none exists. */
export function channelLogo(name: string): ImageSourcePropType | null {
  return CHANNEL_LOGOS[name] ?? null;
}
