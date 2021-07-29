import { LabeledPRContext, PRContext } from "../../types";
import { Application } from "probot";
import { REPO_CORE } from "../../const";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { scheduleComment } from "../../util/comment";
import { fetchPullRequestFilesFromContext } from "../../util/pull_request";
import {
  WebhookPayloadPullRequestPullRequest,
  WebhookPayloadIssuesIssue,
} from "@octokit/webhooks";

const NAME = "NeedsCodeownersLabel";
const NEEDS_CODEOWNERS_LABEL = "needs-codeowners";
const NEW_INTEGRATION_LABEL = "new-integration";

export const initNeedsCodeownersLabel = (app: Application) => {
  app.on(
    ["pull_request.labeled", "pull_request.unlabeled"],
    filterEventByRepo(NAME, [REPO_CORE], runLabeled)
  );
  app.on(
    ["pull_request.synchronize"],
    filterEventByRepo(NAME, [REPO_CORE], runSynchronize)
  );
};

const hasEditedCodeowners = async (context: PRContext) => {
  const files = await fetchPullRequestFilesFromContext(context);
  return files.some((file) => file.filename == "CODEOWNERS");
};

const getLabelNames = (pr: WebhookPayloadPullRequestPullRequest) => {
  return (pr.labels as WebhookPayloadIssuesIssue["labels"]).map(
    (label) => label.name
  );
};

const runLabeled = async (context: LabeledPRContext) => {
  const pr = context.payload.pull_request;
  const label = context.payload.label.name;

  const action = context.payload.action;
  context.log.debug(
    NAME,
    `Running on PR ${context.payload.repository.name}#${pr.number} and label ${label}`
  );

  const isNeedsCodeowners = label === NEEDS_CODEOWNERS_LABEL;
  const isNewIntegration = label === NEW_INTEGRATION_LABEL;

  if (action === "labeled" && isNeedsCodeowners) {
    // When adding needs-codeowners label write a comment
    let commentBody = `Hey there @${pr.user.login},\n`;
    commentBody +=
      "Thanks for submitting this pull request! Can you add yourself as a codeowner for this integration? ";
    commentBody +=
      "This way we can notify you if a bug report for this integration is reported.\n";
    commentBody += "In `__init__.py` of the integration, please add:\n\n";
    commentBody += "```python3\n";
    commentBody += `CODEOWNERS = ["@${pr.user.login}"]\n`;
    commentBody += "```\n\n";
    commentBody += "And run `script/build_codeowners.py`\n";

    context.log(NAME, `Adding comment to PR ${pr.html_url}: ${commentBody}`);

    scheduleComment(context, NAME, commentBody);
  } else if (action === "labeled" && isNewIntegration) {
    // When adding new-integration label check if we should add the needs-codeowners label
    const edited = await hasEditedCodeowners(context);
    if (!edited) {
      await context.github.issues.addLabels(
        context.issue({ labels: [NEEDS_CODEOWNERS_LABEL] })
      );
    }
  } else if (action == "unlabeled" && isNewIntegration) {
    // When removing new-integration label, remove needs-codeowners label
    if (getLabelNames(pr).some((name) => name === NEEDS_CODEOWNERS_LABEL)) {
      await context.github.issues.removeLabel(
        context.issue({ name: NEEDS_CODEOWNERS_LABEL })
      );
    }
  }
};

const runSynchronize = async (context: PRContext) => {
  const pr = context.payload.pull_request;
  context.log.debug(
    NAME,
    `Running on PR ${context.payload.repository.name}#${pr.number}`
  );

  const hasCodeownersLabel = getLabelNames(pr).some(
    (name) => name === NEEDS_CODEOWNERS_LABEL
  );
  if (!hasCodeownersLabel) {
    return;
  }
  const edited = await hasEditedCodeowners(context);
  if (!edited) {
    return;
  }

  await context.github.issues.removeLabel(
    context.issue({ name: NEEDS_CODEOWNERS_LABEL })
  );
};
