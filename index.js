const fs = require("fs");
const exec = require("child_process").exec;

const inquirer = require("inquirer");
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
  let choices = [];
  feedResults.forEach((feedResult, index) => {
    var items = feedResult.items
      .map((feedItem) => feedItem.title)
      .slice(0, 5)
      .map((i) => {
        return { name: i };
      });

    choices.push(
      new inquirer.Separator(
        `Processing Feed (${index + 1}/${feeds.length}: ${
          feedResult.feedUrl.split("/r/")[1].split("/top/.rss")[0]
        }`
      )
    );
    choices = choices.concat(items);
  });

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
