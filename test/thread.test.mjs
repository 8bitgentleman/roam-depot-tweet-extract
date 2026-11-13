import test from 'node:test';
import assert from 'node:assert/strict';
import { getTweetId, fetchThread, selectTweets, getTweetText, fillTemplate } from '../src/thread.mjs';

// A status shaped like the ones api.fxtwitter.com/2/thread/{id} returns.
function makeStatus(id, overrides = {}) {
  const text = `tweet ${id}`;
  return {
    type: 'status',
    url: `https://x.com/naval/status/${id}`,
    id,
    text,
    raw_text: { text, display_text_range: [0, text.length], facets: [] },
    author: { type: 'profile', id: '745273', name: 'Naval', screen_name: 'naval', url: 'https://x.com/naval' },
    replies: 0,
    reposts: 0,
    likes: 0,
    bookmarks: 0,
    quotes: 0,
    embed_card: 'tweet',
    created_at: 'Thu May 31 09:23:54 +0000 2018',
    created_timestamp: 1527758634,
    views: null,
    is_note_tweet: false,
    community_note: null,
    lang: 'en',
    replying_to: null,
    media: {},
    provider: 'twitter',
    reposted_by: null,
    ...overrides,
  };
}

// Tweet `id` of a thread whose tweets are numbered 1, 2, 3...: every tweet but the first replies to the one before it.
function threadTweet(id) {
  if (id === '1') return makeStatus(id);
  const parent = String(Number(id) - 1);
  return makeStatus(id, {
    replying_to: { screen_name: 'naval', status: parent, url: `https://x.com/naval/status/${parent}`, profile_url: 'https://x.com/naval' },
  });
}

function threadResponse(focalId, ids) {
  const thread = ids.map(threadTweet);
  return { code: 200, status: threadTweet(focalId), thread, author: makeStatus(focalId).author };
}

// Fake API: `pages` maps a requested tweet id to the response body for it.
function fakeApi(pages) {
  const requested = [];
  const fetchThreadPage = async (id) => {
    requested.push(id);
    const page = pages[id];
    if (page instanceof Error) throw page;
    return page;
  };
  return { requested, fetchThreadPage };
}

const ids = (thread) => thread.map((status) => status.id);

test('getTweetId reads the id from twitter.com and x.com links', () => {
  assert.equal(getTweetId('https://twitter.com/naval/status/1002103360646823936'), '1002103360646823936');
  assert.equal(getTweetId('https://x.com/naval/status/1002103360646823936?s=20'), '1002103360646823936');
  assert.equal(getTweetId('https://twitter.com/naval/statuses/1002103360646823936'), '1002103360646823936');
});

test('getTweetId uses the last tweet link in the block', () => {
  const block = 'compare https://x.com/jack/status/20 with https://x.com/naval/status/1002103360646823936 #thread-extract';
  assert.equal(getTweetId(block), '1002103360646823936');
});

test('getTweetId returns null when the block has no tweet link', () => {
  assert.equal(getTweetId('just a note with https://example.com/status'), null);
});

test('fetchThread returns the whole thread in order', async () => {
  const api = fakeApi({ 3: threadResponse('3', ['1', '2', '3']) });

  const thread = await fetchThread('3', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['1', '2', '3']);
  assert.deepEqual(api.requested, ['3']);
});

test('fetchThread keeps asking from the last tweet when a long thread comes back cut short', async () => {
  // Asked for the head of a long thread, the API stops early; asked for a later tweet it returns the rest.
  const api = fakeApi({
    1: threadResponse('1', ['1', '2', '3']),
    3: threadResponse('3', ['1', '2', '3', '4', '5']),
    5: threadResponse('5', ['1', '2', '3', '4', '5']),
  });

  const thread = await fetchThread('1', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['1', '2', '3', '4', '5']);
  assert.deepEqual(api.requested, ['1', '3', '5']);
});

test('fetchThread asks for the earlier tweets when a long thread comes back without its start', async () => {
  // Asked for the last tweet of a long thread, the API leaves out the first ones.
  const api = fakeApi({
    5: threadResponse('5', ['3', '4', '5']),
    3: threadResponse('3', ['1', '2', '3', '4']),
  });

  const thread = await fetchThread('5', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['1', '2', '3', '4', '5']);
  assert.deepEqual(api.requested, ['5', '3']);
});

test('fetchThread fills in both ends when the linked tweet is in the middle of a long thread', async () => {
  const api = fakeApi({
    4: threadResponse('4', ['3', '4', '5']),
    5: threadResponse('5', ['3', '4', '5', '6']),
    6: threadResponse('6', ['4', '5', '6']),
    3: threadResponse('3', ['1', '2', '3', '4']),
  });

  const thread = await fetchThread('4', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['1', '2', '3', '4', '5', '6']);
});

test('fetchThread fills the hole between the first tweet and the rest of a long thread', async () => {
  // Asked for the last tweet of a long thread, the API returns the first tweet and the closest ones,
  // leaving out the tweets in between.
  const api = fakeApi({
    7: threadResponse('7', ['1', '5', '6', '7']),
    5: threadResponse('5', ['1', '2', '3', '4', '5', '6']),
  });

  const thread = await fetchThread('7', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['1', '2', '3', '4', '5', '6', '7']);
  assert.deepEqual(api.requested, ['7', '5']);
});

test('fetchThread keeps filling until every tweet follows the one before it', async () => {
  const api = fakeApi({
    9: threadResponse('9', ['1', '7', '8', '9']),
    7: threadResponse('7', ['1', '4', '5', '6', '7', '8']),
    4: threadResponse('4', ['1', '2', '3', '4', '5']),
  });

  const thread = await fetchThread('9', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  assert.deepEqual(api.requested, ['9', '7', '4']);
});

test('fetchThread puts earlier tweets in the right place when two parts of the thread are missing', async () => {
  const api = fakeApi({
    8: threadResponse('8', ['3', '4', '7', '8']),
    7: threadResponse('7', ['1', '5', '6', '7']),
    3: threadResponse('3', ['1', '2', '3', '4']),
  });

  const thread = await fetchThread('8', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['1', '2', '3', '4', '5', '6', '7', '8']);
});

test('fetchThread returns what it can when a hole cannot be filled', async () => {
  // Tweet 3 was deleted: asking again from tweet 4 brings back nothing new.
  const api = fakeApi({
    5: threadResponse('5', ['1', '2', '4', '5']),
    4: threadResponse('4', ['1', '2', '4', '5']),
  });

  const thread = await fetchThread('5', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['1', '2', '4', '5']);
  assert.deepEqual(api.requested, ['5', '4']);
});

test('fetchThread does not mix in another branch while looking for earlier tweets', async () => {
  // Tweet 3 has two replies, 4 and 9. We came from 5, so 9 is not part of this thread.
  const fromThree = threadResponse('3', ['1', '2', '3']);
  fromThree.thread.push(makeStatus('9', { replying_to: { screen_name: 'naval', status: '3' } }));
  const api = fakeApi({
    5: threadResponse('5', ['3', '4', '5']),
    3: fromThree,
  });

  const thread = await fetchThread('5', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['1', '2', '3', '4', '5']);
});

test('fetchThread stops going back when the tweet being replied to is gone', async () => {
  // Tweet 4 replies to a deleted tweet, so asking again from 4 brings nothing earlier.
  const api = fakeApi({
    5: threadResponse('5', ['4', '5']),
    4: threadResponse('4', ['4', '5']),
  });

  const thread = await fetchThread('5', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['4', '5']);
  assert.deepEqual(api.requested, ['5', '4']);
});

test('fetchThread returns the tweet itself when it is not part of a thread', async () => {
  const api = fakeApi({ 20: { code: 200, status: makeStatus('20'), thread: null, author: makeStatus('20').author } });

  const thread = await fetchThread('20', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['20']);
});

test('fetchThread leaves out deleted tweets', async () => {
  const response = threadResponse('3', ['1', '3']);
  response.thread.splice(1, 0, { type: 'tombstone', provider: 'twitter', reason: 'deleted', id: '2' });
  const api = fakeApi({ 3: response });

  const thread = await fetchThread('3', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['1', '3']);
});

test('fetchThread fails when the tweet cannot be found', async () => {
  const api = fakeApi({ 99: { code: 404, status: null, thread: null, author: null } });

  await assert.rejects(fetchThread('99', api.fetchThreadPage), /404/);
});

test('fetchThread keeps the tweets it already has when a later request fails', async (t) => {
  t.mock.method(console, 'error', () => {}); // the failure is logged; keep the test output quiet
  const api = fakeApi({
    1: threadResponse('1', ['1', '2', '3']),
    3: new Error('network down'),
  });

  const thread = await fetchThread('1', api.fetchThreadPage);

  assert.deepEqual(ids(thread), ['1', '2', '3']);
});

test('fetchThread stops after the request limit', async () => {
  // An API that always has one more tweet: request N answers with tweets 1..N+1.
  const requested = [];
  const endless = async (id) => {
    requested.push(id);
    const upTo = Number(id) + 1;
    return threadResponse(id, Array.from({ length: upTo }, (_, i) => String(i + 1)));
  };

  const thread = await fetchThread('1', endless, 4);

  assert.deepEqual(requested, ['1', '2', '3', '4']);
  assert.deepEqual(ids(thread), ['1', '2', '3', '4', '5']);
});

// A conversation: someone else's tweet, then naval replies to it with a thread of three tweets (11, 12, 13).
function conversation() {
  const other = { type: 'profile', id: '999', name: 'Nikita Bier', screen_name: 'nikitabier', url: 'https://x.com/nikitabier' };
  const reply = (id, parent) => ({ replying_to: { screen_name: 'x', status: parent } });
  return [
    makeStatus('10', { author: other, url: 'https://x.com/nikitabier/status/10' }),
    makeStatus('11', reply('11', '10')),
    makeStatus('12', reply('12', '11')),
    makeStatus('13', reply('13', '12')),
  ];
}

test('selectTweets keeps only the linked tweet when no setting is on', () => {
  const tweets = selectTweets(conversation(), '12', { fullThread: false, repliedTo: false });

  assert.deepEqual(ids(tweets), ['12']);
});

test('selectTweets with the full thread setting returns the author\'s thread without the tweet it replies to', () => {
  const tweets = selectTweets(conversation(), '12', { fullThread: true, repliedTo: false });

  assert.deepEqual(ids(tweets), ['11', '12', '13']);
});

test('selectTweets with the replied-to setting returns everything above the linked tweet and nothing after it', () => {
  const tweets = selectTweets(conversation(), '12', { fullThread: false, repliedTo: true });

  assert.deepEqual(ids(tweets), ['10', '11', '12']);
});

test('selectTweets with both settings returns the whole conversation', () => {
  const tweets = selectTweets(conversation(), '12', { fullThread: true, repliedTo: true });

  assert.deepEqual(ids(tweets), ['10', '11', '12', '13']);
});

test('selectTweets does not count the author\'s earlier tweets as the same thread when someone else replied in between', () => {
  // naval (9) <- nikitabier (10) <- naval (11, 12, 13): tweet 9 is a different thread
  const chain = [makeStatus('9'), ...conversation()];

  const tweets = selectTweets(chain, '13', { fullThread: true, repliedTo: false });

  assert.deepEqual(ids(tweets), ['11', '12', '13']);
});

test('selectTweets returns everything when the linked tweet is not in the list', () => {
  const tweets = selectTweets(conversation(), '404', { fullThread: true, repliedTo: false });

  assert.deepEqual(ids(tweets), ['10', '11', '12', '13']);
});

test('getTweetText drops the reply mentions Twitter hides at the start of a thread reply', () => {
  const text = '@Space_Station @astro_hathaway Next is @Astro_Jessica.';
  const status = makeStatus('3', {
    text,
    raw_text: { text, display_text_range: [31, 54], facets: [] },
    replying_to: { screen_name: 'NASA', status: '2' },
  });

  assert.equal(getTweetText(status), 'Next is @Astro_Jessica.');
});

test('getTweetText keeps a mention the author typed at the start of a tweet', () => {
  const text = '@Space_Station is hiring';
  const status = makeStatus('1', { text, raw_text: { text, display_text_range: [0, 24], facets: [] } });

  assert.equal(getTweetText(status), '@Space_Station is hiring');
});

test('getTweetText keeps the full text when the hidden range does not line up with mentions', () => {
  const text = 'Translated text that is unrelated to the raw offsets';
  const status = makeStatus('3', {
    text,
    raw_text: { text: '@naval original text', display_text_range: [7, 20], facets: [] },
    replying_to: { screen_name: 'naval', status: '2' },
  });

  assert.equal(getTweetText(status), text);
});

test('fillTemplate fills in every variable of the default template', () => {
  const template = '[[>]] {TWEET} {NEWLINE} [🐦]({URL}) by {AUTHOR_NAME} on [[{DATE}]]';

  const block = fillTemplate(template, {
    TWEET: 'Seek wealth, not money or status.',
    URL: 'https://x.com/naval/status/1002103497725173760',
    AUTHOR_NAME: 'Naval',
    DATE: 'May 31st, 2018',
  });

  assert.equal(
    block,
    '[[>]] Seek wealth, not money or status. \n [🐦](https://x.com/naval/status/1002103497725173760) by Naval on [[May 31st, 2018]]'
  );
});

test('fillTemplate fills in the author handle, author link and images', () => {
  const block = fillTemplate('{AUTHOR_HANDLE} {AUTHOR_URL}{IMAGES}', {
    AUTHOR_HANDLE: 'naval',
    AUTHOR_URL: 'https://twitter.com/naval',
    IMAGES: ' ![](https://example.com/a.jpg)',
  });

  assert.equal(block, 'naval https://twitter.com/naval ![](https://example.com/a.jpg)');
});

test('fillTemplate removes a variable that has no value', () => {
  assert.equal(fillTemplate('{TWEET}{IMAGES}', { TWEET: 'hello' }), 'hello');
});

test('fillTemplate keeps dollar signs in the tweet text', () => {
  assert.equal(fillTemplate('> {TWEET}', { TWEET: 'worth $$$ and $& more' }), '> worth $$$ and $& more');
});

test('fillTemplate does not expand variable names that appear inside the tweet text', () => {
  const block = fillTemplate('{TWEET} {URL}', { TWEET: 'use {URL} in your template', URL: 'https://x.com/a/status/1' });

  assert.equal(block, 'use {URL} in your template https://x.com/a/status/1');
});

test('fillTemplate leaves other braces alone', () => {
  assert.equal(fillTemplate('{{[[TODO]]}} {TWEET}', { TWEET: 'read this' }), '{{[[TODO]]}} read this');
});
