import { PRContext } from "../../types";
import { Application } from "probot";
import { ORG_ESPHOME, REPO_CORE, REPO_DOCS } from "../../const";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { getIssueFromPayload } from "../../util/issue";
import {
  extractIssuesOrPullRequestMarkdownLinks,
  extractPullRequestURLLinks,
} from "../../util/text_parser";

const NAME = "NeedsDocsLabel";

export const initNeedsDocsLabel = (app: Application) => {
  app.on(
    ["pull_request.labeled", "pull_request.unlabeled", "pull_request.edited"],
    filterEventByRepo(NAME, [REPO_CORE], runNeedsDocsLabel)
  );
};

export const runNeedsDocsLabel = async (context: PRContext) => {
  console.log(context);

  const pr = context.payload.pull_request;
  context.log.debug(
    NAME,
    `Running on PR ${context.payload.repository.name}#${pr.number}`
  );

  const labelsThatNeedDocs = ["new-integration", "needs-docs"];

  const labels = pr.labels.map((label) => label.name);
  const needsDocs = labelsThatNeedDocs.some((label) => labels.includes(label));
  if (!needsDocs) {
    context.log.debug(NAME, `Nothing to do, PR doesn't require docs`);
    return;
  }

  const triggerIssue = getIssueFromPayload(context);
  const hasDocs = extractIssuesOrPullRequestMarkdownLinks(triggerIssue.body)
    .concat(extractPullRequestURLLinks(triggerIssue.body))
    .some((link) => link.owner === ORG_ESPHOME && link.repo === REPO_DOCS);

  if (hasDocs && labels.includes("needs-docs")) {
    await context.github.issues.removeLabel(
      context.issue({ name: "needs-docs" })
    );
  } else if (!hasDocs) {
    await context.github.issues.addLabels(
      context.issue({ labels: ["needs-docs"] })
    );
  }
};
