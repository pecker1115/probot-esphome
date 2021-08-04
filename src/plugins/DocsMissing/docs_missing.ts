import { PRContext } from "../../types";
import { Probot } from "probot";
import { REPO_CORE } from "../../const";
import { filterEventByRepo } from "../../util/filter_event_repo";

const NAME = "DocsMissing";

export const initDocsMissing = (app: Probot) => {
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
  const log = context.log.child({ name: NAME });
  const pr = context.payload.pull_request;
  log.debug(`Running on PR ${context.payload.repository.name}#${pr.number}`);

  const hasDocsMissingLabel = pr.labels
    .map((label) => label.name)
    .includes("needs-docs");

  if (hasDocsMissingLabel) {
    log.info("Adding missing docs status");
    await context.octokit.repos.createCommitStatus(
      context.repo({
        sha: pr.head.sha,
        context: "needs-docs",
        state: "failure",
        description: `Please open a documentation PR.`,
      })
    );
  } else {
    const previousCheck = (
      await context.octokit.repos.listCommitStatusesForRef(
        context.repo({ ref: pr.head.sha })
      )
    ).data
      .filter((it) => it.state === "failure")
      .map((it) => it.context)
      .includes("needs-docs");
    if (previousCheck) {
      log.info("Removing missing docs status");
      await context.octokit.repos.createCommitStatus(
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
