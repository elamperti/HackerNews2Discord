# Hacker News 2 Discord
A simple script to post the most popular HN stories to Discord using webhooks.

![screenshot](https://user-images.githubusercontent.com/910672/44951949-83fbdd80-ae48-11e8-90f0-21c65c0411f1.png)

:stopwatch: Best results when run via cron.

## Setup
Run `npm install`, then create a `.env` file with the following constants:

  * **DISCORD_HOOK**: The URL of the webhook to be used ([how to create a webhook](https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks)) (required)
  * **BEACONS_PATH**: Path where beacon files will be saved (optional, defaults to `./beacons`)
  * **MIN_SCORE**: Minimum amount of points needed to post the story. (optional, defaults to `300`)
  * **MAX_POSTS**: Maximum amount of posts to Discord (to avoid hitting rate limits). (optional, defaults to `4`)

## Usage
Just run `node topNews.js` :sparkles:

## Caveats
The script generates several `.beacon` files that become garbage after a few days (they won't show up in results again). This is not handled by the script, though it can be solved with another cron job (running it once per day should be enough):

```sh
find /path/to/beacons/ -type f -name '*.beacon' -mtime +7 -exec rm {} \;
```

