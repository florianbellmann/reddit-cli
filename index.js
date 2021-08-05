const fs = require("fs");
const RSSParser = require("rss-parser");
const term = require("terminal-kit").terminal;

// reading feed input
const feeds = JSON.parse(fs.readFileSync("feeds.json")).urls;
if (feeds?.length <= 0) {
  console.log("error");
}

async function main() {
  term.green(
    "Welcome to the reddit-cli reader! Start to choose interesting topics..."
  );

  // get feed data
  const feedResults = [];
  const parser = new RSSParser({
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  const rssPromises = [];
  feeds.forEach(async (feedUrl) => {
    rssPromises.push(
      new Promise(async (resolve, reject) => {
        try {
          const fullUrl = `${feedUrl}`;
          const feedResult = await parser.parseURL(fullUrl);
          feedResults.push(feedResult);
          resolve();
        } catch (error) {
          reject(error);
        }
      })
    );
  });
  await Promise.all(rssPromises);

  // display feed data
  feedResults.forEach((feedResult, index) => {
    term.yellow(
      `Processing Feed (${index + 1}/${feeds.length}: ${
        feedResult.feedUrl.split("/r/")[1].split("/top/.rss")[0]
      }\n`
    );
    term("\n");

    var items = feedResult.items.map((feedItem) => feedItem.title).slice(0, 5);
    console.log(`items`, items);

    term.singleColumnMenu(
      items,
      {
        keyBindings: {
          j: "next",
          k: "prev",
        },
      },
      function (error, response) {
        term("\n").eraseLineAfter.green(
          "#%s selected: %s (%s,%s)\n",
          response.selectedIndex,
          response.selectedText,
          response.x,
          response.y
        );
        process.exit();
      }
    );
  });
}

main();
