const fs = require("fs");
const exec = require("child_process").exec;

const inquirer = require("inquirer");
const RSSParser = require("rss-parser");
const term = require("terminal-kit").terminal;

// reading feed input
const feeds = JSON.parse(fs.readFileSync("feeds.json"))?.urls;
if (feeds?.length <= 0) {
  console.error("Error. No feeds to read from.");
}

// reading stored posts from before
let oldFeeds = readOldFeeds();
function readOldFeeds() {
  let feeds = [];
  try {
    feeds = JSON.parse(fs.readFileSync("oldFeeds.json"));
  } catch {
    console.log("No old feeds found.");
  }
  return feeds;
}

// storing already displayed feeds
function storeFeeds(items) {
  oldFeeds = oldFeeds.concat(
    items.map((i) => {
      return { name: i.name, date: new Date().getTime() };
    })
  );

  const tenDaysAgo = new Date().setDate(new Date().getDate() - 10);
  oldFeeds = oldFeeds.filter((f) => f.date > tenDaysAgo);
  const uniq = [...new Set(oldFeeds)];

  if (oldFeeds) fs.writeFileSync("oldFeeds.json", JSON.stringify(uniq));
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
          const fullUrl = `${feedUrl}?limit=8&t=week`;
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
  let choices = [];
  feedResults.forEach((feedResult, index) => {
    var items = feedResult.items
      .map((feedItem) => feedItem.title)
      .map((i) => {
        return { name: i };
      })
      .filter((item) => {
        return oldFeeds?.map((f) => f.name).indexOf(item.name) === -1;
      })
      .slice(0, 3);

    storeFeeds(items);

    choices.push(
      new inquirer.Separator(
        `Processing Feed (${index + 1}/${feeds.length}): ${feedResult.feedUrl.split("/r/")[1].split("/top/.rss")[0]
        }`
      )
    );
    choices = choices.concat(items);
    choices.push(new inquirer.Separator(""));
  });
  choices.push(
    new inquirer.Separator(
      "=================================================================="
    )
  );
  choices.push(
    new inquirer.Separator(
      "=================================================================="
    )
  );
  choices.push(
    new inquirer.Separator(
      "=================================================================="
    )
  );

  // ask for topics to view
  const answers = await inquirer.prompt([
    {
      type: "checkbox",
      message: "Select topics",
      name: "topics",
      choices: choices,
      pageSize: 50,
    },
  ]);

  //opening topics
  const posts = feedResults.flatMap((f) => f.items);
  posts.forEach((post) => {
    if (answers.topics.indexOf(post.title) > -1) {
      exec(`open ${post.link}`);
    }
  });
}

main();
