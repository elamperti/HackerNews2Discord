#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const dotenv = require('./node_modules/dotenv/lib/main.js');

dotenv.config({path: path.resolve(__dirname, '.env')});

const minScore = process.env.MIN_SCORE || 300;
const beaconsPath = process.env.BEACONS_PATH || path.resolve(__dirname, 'beacons');
let remainingCalls = process.env.MAX_POSTS || 4; // May change if rate limit is lower

if (!process.env.DISCORD_HOOK) {
  console.error('Discord hook missing');
  process.exit(1);
}

// console.log(`Discord hook: ${process.env.DISCORD_HOOK}`);
// console.log(`Min score: ${minScore}`);
// console.log(`Max posts: ${maxPostsPerCall}`);
// console.log(`Beacons path: ${beaconsPath}`);

function storyIsNew(id) {
  return !fs.existsSync(`${beaconsPath}/${id}.beacon`);
}

function postToDiscord(story) {
  const hook = process.env.DISCORD_HOOK.replace(/.+\/webhooks\//, '');
  const opts = {
    hostname: 'discordapp.com',
    path: `/api/webhooks/${hook}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  let description = '';
  if (story.url) {
    description += `[**Link**](${story.url}) • `;
  }
  description += `[${story.num_comments} comments](https://news.ycombinator.com/item?id=${story.objectID})`;

  const payload = {
    embeds: [
      {
        title: story.title,
        description,
        // url: story.url,
        color: 0xff6600,
        timestamp: story.created_at,
      },
    ],
  };

  return new Promise((resolve, reject) => {
    const request = https.request(opts, (response) => {
      if (response.headers && response.headers['X-RateLimit-Remaining']) {
        let newRemaining = response.headers['X-RateLimit-Remaining'];
        if (newRemaining < remainingCalls) {
          remainingCalls = newRemaining;
          console.warn(`Adjusted remaining calls to ${newRemaining}`);
        }
      }
    });

    request.on('error', reject);
    request.end(JSON.stringify(payload));
    resolve();
  });
}

function markStoryRead(id) {
  // Touch beacon file with story id
  const beacon = `${beaconsPath}/${id}.beacon`;
  fs.writeFile(beacon, '', (err) => {if (err) throw err});
}

function getNews() {
  return new Promise((resolve, reject) => {
    const request = https.get(`https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points%3E${minScore}`, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        const result = JSON.parse(data);
        if (result.hits) {
          resolve(result.hits);
        } else {
          reject();
        }
      });

      response.on('error', reject);
    });
  });
}

function checkStories(stories) {
  let count = 0;
  for (let story of stories) {
    if (storyIsNew(story.objectID)) {
      remainingCalls--;
      postToDiscord(story)
        .then(() => markStoryRead(story.objectID))
        .catch((err) => console.error('Failed posting to Discord', err));
    }
    if (remainingCalls <= 0) break;
  }
}

getNews()
  .then(checkStories)
  .catch(() => console.error('Couldn\'t fetch news'));

