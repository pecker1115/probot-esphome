import { PRContext } from "../../types";
import { Probot } from "probot";
import { REPO_CORE, REPO_DOCS } from "../../const";
import { extractRepoFromContext } from "../../util/filter_event_repo";
import { getIssueFromPayload } from "../../util/issue";

const NAME = "LabelCleaner";

// Map repositories to labels that need cleaning.
const TO_CLEAN: { [key: string]: string[] } = {
  [REPO_CORE]: ["ready-for-review"],
  [REPO_DOCS]: [
    "wrong-base-branch",
    "in-progress",
    "awaits-parent",
    "ready-for-review",
    "parent-merged",
  ],
};

export const initLabelCleaner = (app: Probot) => {
  app.on(["pull_request.closed"], runLabelCleaner as any);
};

export const runLabelCleaner = async (context: PRContext) => {
  const log = context.log.child({ name: NAME });
  const repo = extractRepoFromContext(context);

  if (!(repo in TO_CLEAN)) {
    return;
  }
  const pr = getIssueFromPayload(context);
  log.debug(`Running on ${context.payload.repository.name}#${pr.number}`);

  const currentLabels = pr.labels.map((label) => label.name);
  log.debug(`Current Labels: ${currentLabels}`);

  const labelsToRemove = TO_CLEAN[repo]
    // Find all labels that the PR has
    .filter((label) => currentLabels.includes(label));

  // If any label delete tasks created, await them.
  if (labelsToRemove.length) {
    log.info(`Cleaning up labels: ${labelsToRemove.join(", ")}`);
    await Promise.all(
      labelsToRemove.map((label) =>
        context.octokit.issues.removeLabel(
          context.issue({
            name: label,
          })
        )
      )
    );
  }
};
