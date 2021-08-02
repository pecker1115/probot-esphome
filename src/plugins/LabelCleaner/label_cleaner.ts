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
  const repo = extractRepoFromContext(context);

  if (!(repo in TO_CLEAN)) {
    return;
  }
  const pr = getIssueFromPayload(context);
  context.log(
    NAME,
    `Running on ${context.payload.repository.name}#${pr.number}`
  );

  const currentLabels = pr.labels.map((label) => label.name);
  context.log(NAME, `Current Labels: ${currentLabels}`);

  const labelsToRemove = TO_CLEAN[repo]
    // Find all labels that the PR has
    .filter((label) => currentLabels.includes(label));

  // If any label delete tasks created, await them.
  if (labelsToRemove.length) {
    context.log(NAME, `Cleaning up labels: ${labelsToRemove.join(", ")}`);
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
