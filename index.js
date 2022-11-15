const core = require('@actions/core');
const github = require('@actions/github');
const openapiDiff = require('openapi-diff');
const fs = require('fs');
const glob = require("glob");
const path = require('path');

async function run() {
  let baseFiles = glob.sync(core.getInput('baseFile', { required: true }));
  let headFiles = glob.sync(core.getInput('headFile', { required: true }));

  let githubToken = core.getInput('github_token', { required: false });

  if (baseFiles.length != headFiles.length) {
    core.error('Invalid input files');
    return;
  }

  let message = "## OpenApi Specification changes";

  for (let index = 0; index < baseFiles.length; index++) {
    const basefile = baseFiles[index];
    const headfile = headFiles[headFiles.findIndex(element => path.basename(element) === path.basename(basefile))];

    const result = await diffSpecs(basefile, headfile);
    message += `\n\n### ${path.basename(basefile)}\n\n`;
    message += markdownMessage(result);
  }

  core.info(message);

  if (githubToken) {
    comment(githubToken, message)
  }
}

function diffSpecs(baseFile, headFile) {
  return openapiDiff
    .diffSpecs({
      sourceSpec: {
        content: fs.readFileSync(baseFile, 'utf8'),
        format: 'openapi3'
      },
      destinationSpec: {
        content: fs.readFileSync(headFile, 'utf8'),
        format: 'openapi3'
      }
    })
}

function comment(githubToken, message) {
  if (message.length === 0) {
    return;
  }

  const octokit = github.getOctokit(githubToken);
  let { owner, repo } = github.context.repo;

  if (core.getInput('repo')) {
    [owner, repo] = core.getInput('repo').split('/');
  }

  const issueNumber = github.context.issue.number;

  octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body: message
  });
}

function markdownMessage(openApiResults) {
  let breaking = openApiResultsTable(openApiResults.breakingDifferences);
  if (breaking.length > 0) {
    breaking =
      "#### :rotating_light: Breaking Api Changes \n" +
      "|             | Action | Path |\n" +
      "|-------------|--------|------|\n"
      + breaking;
  }

  let nonBreaking = openApiResultsTable(openApiResults.nonBreakingDifferences);
  if (nonBreaking.length > 0) {
    nonBreaking =
      "#### :heavy_check_mark: Api Changes \n" +
      "|             | Action | Path |\n" +
      "|-------------|--------|------|\n"
      + nonBreaking;
  }

  if (breaking.length > 0 || nonBreaking.length > 0) {
    return breaking + "\n\n"
      + nonBreaking;
  }

  return "#### :rocket: There are no API Changes";
}

function openApiResultsTable(changes) {
  let msg = "";

  if (typeof changes === "undefined") {
    return "";
  }

  changes.forEach(function (item) {
    if (typeof item.sourceSpecEntityDetails !== "undefined") {
      item.sourceSpecEntityDetails.forEach(function (entity) {
        msg += "| " + actionEmoji(item.code) + "| " + item.code + " | " + entity.location + " |\n";
      })
    }

    if (typeof item.destinationSpecEntityDetails !== "undefined") {
      item.destinationSpecEntityDetails.forEach(function (entity) {
        msg += "| " + actionEmoji(item.code) + "| " + item.code + " | " + entity.location + " |\n";
      })
    }
  })

  return msg;
}

function actionEmoji(code) {
  // :zap:
  switch (code) {
    case "method.remove":
    case "path.remove":
      return ":collision:";
    case "method.add":
      return ":heavy_plus_sign:";
    case "path.add":
      return ":sparkles:";
    default:
      return ":question:";
  }
}

run()
  .then(() => {
  })
  .catch((error) => {
    console.log(error)
    core.setFailed(error.message);
  });