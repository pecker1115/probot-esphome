import { LabeledIssueOrPRContext } from "../../types";
import { Probot } from "probot";
import { REPO_ISSUES, REPO_FEATURE_REQUESTS } from "../../const";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { scheduleComment } from "../../util/comment";
import { getIssueFromPayload } from "../../util/issue";

const NAME = "IssueLinks";

export const initIssueLinks = (app: Probot) => {
  app.on(
    ["issues.labeled"],
    filterEventByRepo(NAME, [REPO_ISSUES], runIssueLinks)
  );
};

export const runIssueLinks = async (context: LabeledIssueOrPRContext) => {
  const log = context.log.child({ name: NAME });
  const triggerIssue = getIssueFromPayload(context as any);
  const labelName = context.payload.label.name;
  log.debug(
    `Running for issue ${context.payload.repository.name}#${triggerIssue.number} and label "${labelName}"`
  );

  if (labelName.indexOf("integration: ") === -1) {
    return;
  }

  const integrationName = labelName.split("integration: ")[1];
  const codeLink = `https://github.com/esphome/esphome/tree/dev/esphome/components/${integrationName}`;
  const filterPRs = encodeURIComponent(`is:pr label:"${labelName}"`);
  const filterIssues = encodeURIComponent(`is:issue label:"${labelName}"`);
  const prsLink = `https://github.com/esphome/esphome/pulls?q=${filterPRs}`;
  const issuesLink = `https://github.com/esphome/issues/issues?q=${filterIssues}`;

  const commentBody = [
    `[${integrationName} source](${codeLink})`,
    `[${integrationName} issues](${issuesLink})`,
    `[${integrationName} recent changes](${prsLink})`,
  ].join("\n");

  log.info(`Adding comment with links ${commentBody}`);
  scheduleComment(context, NAME, commentBody);
};
