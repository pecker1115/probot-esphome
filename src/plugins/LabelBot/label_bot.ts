import { ParsedPath } from "../../util/parse_path";
import { fetchPullRequestFilesFromContext } from "../../util/pull_request";

// Convert a list of file paths to labels to set

import componentAndPlatform from "./strategies/componentAndPlatform";
import newIntegrationOrPlatform from "./strategies/newIntegrationOrPlatform";
import removePlatform from "./strategies/removePlatform";
import warnOnMergeToRelease from "./strategies/warnOnMergeToRelease";
import markCore from "./strategies/markCore";
import smallPR from "./strategies/smallPR";
import hasTests from "./strategies/hasTests";
import needsTests from "./strategies/needsTests";
import typeOfChange from "./strategies/typeOfChange";
import markDashboard from "./strategies/markDashboard";
import { PRContext } from "../../types";
import { Probot } from "probot";
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
  needsTests,
  // typeOfChange,
  markDashboard,
];

export const initLabelBot = (app: Probot) => {
  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.synchronize",
    ],
    filterEventNoBot(NAME, filterEventByRepo(NAME, [REPO_CORE], runLabelBot))
  );
  app.on(
    "pull_request.labeled",
    filterEventByRepo(NAME, [REPO_CORE], async (context) => {
      if (context.payload.label.name === "probot-recheck") {
        await runLabelBot(context);
      }
    })
  );
};

export const runLabelBot = async (context: PRContext) => {
  const log = context.log.child({ name: NAME });
  const pr = context.payload.pull_request;
  log.info(`Running on PR ${context.payload.repository.name}#${pr.number}`);

  const currentLabels = pr.labels.map((label) => label.name);
  const currentLabelsStr = currentLabels
    .map((label) => `"${label}"`)
    .join(", ");
  log.debug(`current labels: ${currentLabelsStr}`);

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
        "needs-tests",
        "probot-recheck",
      ].includes(label)
  );
  const managedLabelsStr = managedLabels
    .map((label) => `"${label}"`)
    .join(", ");
  log.debug(`of those are managed: ${managedLabelsStr}`);

  const files = await fetchPullRequestFilesFromContext(context);
  const parsed = files.map((file) => new ParsedPath(file));
  const labelSet = new Set<string>();

  STRATEGIES.forEach((strategy) => {
    for (let label of strategy(context, parsed, labelSet)) {
      labelSet.add(label);
    }
  });

  if (context.payload.pull_request.base.ref !== "dev") {
    // when base ref is not dev, only use merging-to-* tags.
    labelSet.clear();
    for (let label of warnOnMergeToRelease(context, parsed, labelSet)) {
      labelSet.add(label);
    }
  }
  const labels = Array.from(labelSet);
  const labelStr = labels.map((label) => `"${label}"`).join(", ");
  log.debug(`computed labels: ${labelStr}`);

  const promises: Promise<unknown>[] = [];

  if (labels.length > 15) {
    log.debug(
      `Not setting ${labels.length} labels because out of range of what we allow`
    );
  } else if (labels.length > 0) {
    log.info(
      `Setting labels on PR ${
        context.payload.pull_request.number
      }: ${labels.join(", ")}`
    );

    promises.push(
      context.octokit.issues.addLabels(
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
    log.info(
      `Removing labels on PR ${
        context.payload.pull_request.number
      }: ${removeLabels.join(", ")}`
    );
    removeLabels.forEach((label) => {
      promises.push(
        context.octokit.issues.removeLabel(
          context.issue({
            name: label,
          })
        )
      );
    });
  }

  await Promise.all(promises);
};
