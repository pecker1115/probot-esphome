import { ParsedPath } from "../../util/parse_path";
import { fetchPullRequestFilesFromContext } from "../../util/pull_request";
import { WebhookPayloadIssuesIssue } from "@octokit/webhooks";

// Convert a list of file paths to labels to set

import componentAndPlatform from "./strategies/componentAndPlatform";
import newIntegrationOrPlatform from "./strategies/newIntegrationOrPlatform";
import removePlatform from "./strategies/removePlatform";
import warnOnMergeToMaster from "./strategies/warnOnMergeToMaster";
import markCore from "./strategies/markCore";
import smallPR from "./strategies/smallPR";
import hasTests from "./strategies/hasTests";
import typeOfChange from "./strategies/typeOfChange";
import { PRContext } from "../../types";
import { Application } from "probot";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { filterEventNoBot } from "../../util/filter_event_no_bot";
import { REPO_CORE } from "../../const";

const NAME = "LabelBot";

const STRATEGIES = [
  componentAndPlatform,
  newIntegrationOrPlatform,
  // removePlatform,
  warnOnMergeToMaster,
  markCore,
  smallPR,
  hasTests,
  // typeOfChange,
];

export const initLabelBot = (app: Application) => {
  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.synchronize",
    ],
    filterEventNoBot(NAME, filterEventByRepo(NAME, [REPO_CORE], runLabelBot))
  );
};

export const runLabelBot = async (context: PRContext) => {
  const pr = context.payload.pull_request;

  const currentLabels = (pr.labels as WebhookPayloadIssuesIssue["labels"]).map(
    (label) => label.name
  );

  const managedLabels = currentLabels.filter(
    (label) =>
      label.startsWith("integration: ") ||
      [
        "new-integration",
        "new-platform",
        "merging-to-master",
        "merging-to-beta",
        "core",
        "small-pr",
        "has-tests",
      ].includes(label)
  );

  const files = await fetchPullRequestFilesFromContext(context);
  const parsed = files.map((file) => new ParsedPath(file));
  const labelSet = new Set();

  STRATEGIES.forEach((strategy) => {
    for (let label of strategy(context, parsed)) {
      labelSet.add(label);
    }
  });

  const labels = Array.from(labelSet);

  if (labels.length === 0 || labels.length > 9) {
    context.log(
      `LabelBot: Not setting ${labels.length} labels because out of range of what we allow`
    );
    return;
  }

  context.log(
    `LabelBot: Setting labels on PR ${
      context.payload.pull_request.number
    }: ${labels.join(", ")}`
  );

  await context.github.issues.addLabels(
    // Bug in Probot: https://github.com/probot/probot/issues/917
    // @ts-ignore
    context.issue({
      labels,
    })
  );

  const removeLabels = currentLabels.filter(
    (label) => !managedLabels.includes(label) || !labels.includes(label)
  );
  if (removeLabels.length > 0) {
    await context.github.issues.removeLabels(
      // @ts-ignore
      context.issue({
        labels,
      })
    );
  }
};
