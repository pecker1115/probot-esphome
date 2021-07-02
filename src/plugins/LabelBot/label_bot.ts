import { ParsedPath } from "../../util/parse_path";
import { fetchPullRequestFilesFromContext } from "../../util/pull_request";
import { WebhookPayloadIssuesIssue } from "@octokit/webhooks";

// Convert a list of file paths to labels to set

import componentAndPlatform from "./strategies/componentAndPlatform";
import newIntegrationOrPlatform from "./strategies/newIntegrationOrPlatform";
import removePlatform from "./strategies/removePlatform";
import warnOnMergeToRelease from "./strategies/warnOnMergeToRelease";
import markCore from "./strategies/markCore";
import smallPR from "./strategies/smallPR";
import hasTests from "./strategies/hasTests";
import typeOfChange from "./strategies/typeOfChange";
import markDashboard from "./strategies/markDashboard";
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
  warnOnMergeToRelease,
  markCore,
  smallPR,
  hasTests,
  // typeOfChange,
  markDashboard,
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
  context.log(
    NAME,
    `Running on PR ${context.payload.repository.name}#${pr.number}`
  );

  const currentLabels = (pr.labels as WebhookPayloadIssuesIssue["labels"]).map(
    (label) => label.name
  );
  const currentLabelsStr = currentLabels
    .map((label) => `"${label}"`)
    .join(", ");
  context.log.debug(NAME, `current labels: ${currentLabelsStr}`);

  const managedLabels = currentLabels.filter(
    (label) =>
      label.startsWith("integration: ") ||
      [
        "new-integration",
        "new-platform",
        "merging-to-release",
        "merging-to-beta",
        "core",
        "small-pr",
        "dashboard",
        "has-tests",
      ].includes(label)
  );
  const managedLabelsStr = managedLabels
    .map((label) => `"${label}"`)
    .join(", ");
  context.log.debug(NAME, `of those are managed: ${managedLabelsStr}`);

  const files = await fetchPullRequestFilesFromContext(context);
  const parsed = files.map((file) => new ParsedPath(file));
  const labelSet = new Set();

  STRATEGIES.forEach((strategy) => {
    for (let label of strategy(context, parsed)) {
      labelSet.add(label);
    }
  });
  if (context.payload.pull_request.base.ref !== "dev") {
    // when base ref is not dev, only use merging-to-* tags.
    labelSet.clear();
    for (let label of warnOnMergeToRelease(context, parsed)) {
      labelSet.add(label);
    }
  }
  const labels = Array.from(labelSet);
  const labelStr = labels.map((label) => `"${label}"`).join(", ");
  context.log.debug(NAME, `computed labels: ${labelStr}`);

  const promises: Promise<unknown>[] = [];

  if (labels.length > 15) {
    context.log(
      NAME,
      `Not setting ${labels.length} labels because out of range of what we allow`
    );
  } else if (labels.length > 0) {
    context.log(
      NAME,
      `Setting labels on PR ${
        context.payload.pull_request.number
      }: ${labels.join(", ")}`
    );

    promises.push(
      context.github.issues.addLabels(
        // Bug in Probot: https://github.com/probot/probot/issues/917
        // @ts-ignore
        context.issue({
          labels: labels,
        })
      )
    );
  }

  const removeLabels = currentLabels.filter(
    (label) => managedLabels.includes(label) && !labels.includes(label)
  );
  if (removeLabels.length > 0) {
    context.log(
      NAME,
      `Removing labels on PR ${
        context.payload.pull_request.number
      }: ${removeLabels.join(", ")}`
    );
    removeLabels.forEach((label) => {
      promises.push(
        context.github.issues.removeLabel({ ...context.issue(), name: label })
      );
    });
  }

  await Promise.all(promises);
};
