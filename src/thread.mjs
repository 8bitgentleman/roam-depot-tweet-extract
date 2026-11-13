// Thread helpers. Nothing in here touches Roam or the DOM, so it can be tested with `npm test`.

// One request is not always enough. FxTwitter only returns the ~30 tweets closest to the one asked
// for (plus the first tweet of the thread), so a long thread comes back with its end missing, or
// with a hole after the first tweet. Asking again from the tweet next to the missing part fills it in.
const MAX_THREAD_REQUESTS = 10;

const TEMPLATE_VARIABLES = /\{(TWEET|URL|AUTHOR_NAME|AUTHOR_HANDLE|AUTHOR_URL|DATE|NEWLINE|IMAGES)\}/g;

// id of the last tweet linked in a block, or null if there is none
export function getTweetId(text) {
  const matches = [...String(text).matchAll(/status(?:es)?\/(\d+)/g)];
  return matches.length ? matches[matches.length - 1][1] : null;
}

// Returns every tweet of the thread `tweetId` belongs to, oldest first.
// `fetchThreadPage(id)` resolves to the JSON body of https://api.fxtwitter.com/2/thread/{id}
export async function fetchThread(tweetId, fetchThreadPage, maxRequests = MAX_THREAD_REQUESTS) {
  const requested = new Set();
  const canRequest = (id) => requested.size < maxRequests && !requested.has(id);

  // the part of the thread around tweet `id`, oldest first
  async function getPage(id) {
    requested.add(id);
    const json = await fetchThreadPage(id);
    if (json.code !== 200 || !json.status) {
      throw new Error(`FxTwitter error: ${json.code}`);
    }
    // a tweet that isn't part of a thread comes back with an empty thread
    const page = json.thread?.length ? json.thread : [json.status];
    // deleted or private tweets come back as tombstones with no text
    return page.filter((status) => status.type !== 'tombstone');
  }

  let thread = await getPage(tweetId);
  if (!thread.length) {
    throw new Error(`FxTwitter returned no tweets for ${tweetId}`);
  }

  try {
    // later tweets: ask again from the last tweet until nothing comes after it
    while (canRequest(thread[thread.length - 1].id)) {
      const last = thread[thread.length - 1];
      const page = await getPage(last.id);
      const position = page.findIndex((status) => status.id === last.id);
      if (position !== -1) thread = thread.concat(page.slice(position + 1));
    }

    // earlier tweets: every tweet should be a reply to the one before it. Where one isn't, tweets
    // are missing in front of it, so ask for the tweets leading up to it.
    for (let i = thread.length - 1; i >= 0; i--) {
      const tweet = thread[i];
      const previous = thread[i - 1];
      const parentId = tweet.replying_to?.status;
      if (!parentId || parentId === previous?.id || !canRequest(tweet.id)) continue;

      const page = await getPage(tweet.id);
      const known = new Set(thread.map((status) => status.id));
      // only keep what leads up to this tweet, what follows it may belong to another branch
      const missing = page
        .slice(0, Math.max(page.findIndex((status) => status.id === tweet.id), 0))
        .filter((status) => !known.has(status.id) && (!previous || BigInt(status.id) > BigInt(previous.id)));

      thread.splice(i, 0, ...missing);
      i += missing.length; // the tweets just added get checked as well
    }
  } catch (error) {
    // keep what we already have rather than losing the whole thread
    console.error("FxTwitter API failure while loading the rest of the thread.", error);
  }

  return thread;
}

// The conversation from fetchThread can start with other people's tweets when the thread is a
// reply. This keeps the thread itself: the linked tweet and its author's tweets directly around it.
export function selectThread(conversation, tweetId) {
  const linked = conversation.findIndex((status) => status.id === tweetId);
  if (linked === -1) return conversation;

  const sameAuthor = (status) => status.author.id === conversation[linked].author.id;
  let first = linked;
  let last = linked;
  while (first > 0 && sameAuthor(conversation[first - 1])) first--;
  while (last < conversation.length - 1 && sameAuthor(conversation[last + 1])) last++;

  return conversation.slice(first, last + 1);
}

// Replies in a thread start with the handles of everyone being replied to ("@a @b actual text").
// Twitter hides those, so drop them too.
export function getTweetText(status) {
  const hiddenLength = status.raw_text?.display_text_range?.[0] || 0;
  if (!status.replying_to || hiddenLength === 0) return status.text;

  const hidden = status.text.slice(0, hiddenLength);
  return /^(@\w+\s+)+$/.test(hidden) ? status.text.slice(hiddenLength) : status.text;
}

// Fills the template in a single pass so tweet text is never re-read as template syntax
export function fillTemplate(template, values) {
  return template.replace(TEMPLATE_VARIABLES, (match, name) => {
    if (name === 'NEWLINE') return "\n";
    return values[name] ?? "";
  });
}
