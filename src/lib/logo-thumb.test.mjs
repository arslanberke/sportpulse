import assert from 'node:assert/strict';
import { test } from 'node:test';

import { logoThumb } from './logo-thumb.ts';

test('ESPN logos go through the combiner resizer', () => {
  assert.equal(
    logoThumb('https://a.espncdn.com/i/teamlogos/soccer/500/3067.png'),
    'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/3067.png&w=96&h=96',
  );
});

test('TheSportsDB badges use the tiny variant', () => {
  assert.equal(
    logoThumb('https://r2.thesportsdb.com/images/media/team/badge/blk9771656932845.png'),
    'https://r2.thesportsdb.com/images/media/team/badge/blk9771656932845.png/tiny',
  );
});

test('mirrored storage logos are resized by wsrv.nl', () => {
  const src = 'https://vyqkpnhhjjbvcprdncnx.supabase.co/storage/v1/object/public/team-logos/a.png';
  assert.equal(
    logoThumb(src),
    `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=96&h=96&fit=contain&output=webp`,
  );
});

test('other hosts and empty values are untouched', () => {
  assert.equal(logoThumb('https://sports.bzzoiro.com/img/team/392/'), 'https://sports.bzzoiro.com/img/team/392/');
  assert.equal(logoThumb('https://a.espncdn.com/combiner/i?img=/i/x.png'), 'https://a.espncdn.com/combiner/i?img=/i/x.png');
  assert.equal(logoThumb(null), undefined);
});
