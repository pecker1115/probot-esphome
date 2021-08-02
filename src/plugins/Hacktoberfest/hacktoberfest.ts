import { PRContext } from "../../types";
import { Probot } from "probot";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { REPO_CORE } from "../../const";
import { filterEventNoBot } from "../../util/filter_event_no_bot";

const NAME = "Hacktoberfest";

const isHacktoberfestLive = () => new Date().getMonth() == 9;

export const initHacktoberfest = (app: Probot) => {
  if (isHacktoberfestLive()) {
    app.on(["pull_request.opened"], runHacktoberfestNewPR as any);
  }
  app.on(["pull_request.closed"], runHacktoberfestClosedPR as any);
};

const runHacktoberfestNewPR = async (context: PRContext) => {
  await context.octokit.issues.addLabels(
    context.issue({
      labels: ["Hacktoberfest"],
    })
  );
};

const runHacktoberfestClosedPR = async (context: PRContext) => {
  const pr = context.payload.pull_request;

  // Don't do something if the PR got merged or if it had no Hacktoberfest label.
  if (
    pr.merged ||
    pr.labels.find((label) => label.name === "Hacktoberfest") == undefined
  ) {
    return;
  }

  // If a Hacktoberfest PR got closed, automatically add "invalid" to it so it wont't count for Hacktoberfest
  await Promise.all([
    context.octokit.issues.addLabels(
      context.issue({
        labels: ["invalid"],
      })
    ),
    context.octokit.issues.removeLabel(
      context.issue({
        name: "Hacktoberfest",
      })
    ),
  ]);
};
