import { PRContext } from "../../types";
import { Application } from "probot";
import { REPO_CORE } from "../../const";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { WebhookPayloadIssuesIssue } from "@octokit/webhooks";

const NAME = "DocsMissing";

export const initDocsMissing = (app: Application) => {
  app.on(
    [
      "pull_request.labeled",
      "pull_request.unlabeled",
      "pull_request.synchronize",
    ],
    filterEventByRepo(NAME, [REPO_CORE], runDocsMissing)
  );
};

export const runDocsMissing = async (context: PRContext) => {
  const pr = context.payload.pull_request;

  const hasDocsMissingLabel = (pr.labels as WebhookPayloadIssuesIssue["labels"])
    .map((label) => label.name)
    .includes("needs-docs");

  if (hasDocsMissingLabel) {
    await context.github.repos.createStatus(
      context.repo({
        sha: pr.head.sha,
        context: "needs-docs",
        state: "failure",
        description: `Please open a documentation PR.`,
      })
    );
  } else {
    const previousCheck = (await context.github.repos.listStatusesForRef(
      context.repo({ ref: pr.head.sha })
    )).data
      .filter((it) => it.state === "failure")
      .map((it) => it.context)
      .includes("needs-docs");
    if (previousCheck) {
      await context.github.repos.createStatus(
        context.repo({
          sha: pr.head.sha,
          context: "needs-docs",
          state: "success",
          description: `Documentation ok.`,
        })
      );
    }
  }
};
