import { LabeledIssueOrPRContext } from "../../types";
import { Application } from "probot";
import { REPO_ISSUES, REPO_FEATURE_REQUESTS } from "../../const";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { scheduleComment } from "../../util/comment";

const NAME = "IssueLinks";

export const initIssueLinks = (app: Application) => {
  app.on(
    ["issues.labeled"],
    filterEventByRepo(NAME, [REPO_ISSUES], runIssueLinks)
  );
};

export const runIssueLinks = async (context: LabeledIssueOrPRContext) => {
  const labelName = context.payload.label.name;

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

  context.log(NAME, `Adding comment with links ${commentBody}`);
  scheduleComment(context, "IssueLinks", commentBody);
};
