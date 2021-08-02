import { PRContext } from "../../types";
import { Probot } from "probot";
import { REPO_DOCS } from "../../const";
import { filterEventByRepo } from "../../util/filter_event_repo";

const NAME = "DocsBranchLabels";

const BRANCHES = ["current", "beta", "next"];

export const initDocsBranchLabels = (app: Probot) => {
  app.on(
    ["pull_request.opened", "pull_request.edited"],
    filterEventByRepo(NAME, [REPO_DOCS], runDocsBranchLabels)
  );
};

export const runDocsBranchLabels = async (context: PRContext) => {
  const pr = context.payload.pull_request;
  context.log(
    NAME,
    `Running on ${context.payload.repository.name}#${pr.number}`
  );

  const targetBranch = pr.base.ref;
  const currentLabels = pr.labels.map((label) => label.name);
  const tasks: Promise<unknown>[] = [];
  context.log(NAME, `Current labels: ${currentLabels}`);

  if (
    BRANCHES.includes(targetBranch) &&
    !currentLabels.includes(targetBranch)
  ) {
    context.log(NAME, `Adding label ${targetBranch} to PR ${pr.number}`);
    tasks.push(
      context.octokit.issues.addLabels(
        context.issue({
          labels: [targetBranch],
        })
      )
    );
  }

  // Find labels to remove
  const toRemove = currentLabels.filter(
    (label) => BRANCHES.includes(label) && label !== targetBranch
  );
  context.log(NAME, `Removing labels: ${toRemove}`);
  toRemove.forEach((label) =>
    tasks.push(
      context.octokit.issues.removeLabel(
        context.issue({
          name: label,
        })
      )
    )
  );

  if (tasks.length) {
    await Promise.all(tasks);
  }
};
