import { LabeledIssueOrPRContext } from "../../types";
import { Application } from "probot";
import { REPO_ISSUES, REPO_FEATURE_REQUESTS } from "../../const";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { scheduleComment } from "../../util/comment";

const NAME = "IssueLinks";

export const initIssueLinks = (app: Application) => {
  app.on(
    ["issues.labeled"],
    filterEventByRepo(NAME, [REPO_ISSUES, REPO_FEATURE_REQUESTS], runIssueLinks)
  );
};

export const runIssueLinks = async (context: LabeledIssueOrPRContext) => {
  const labelName = context.payload.label.name;

  if (labelName.indexOf("integration: ") === -1) {
    return;
  }

  const integrationName = labelName.split("integration: ")[1];
  const codeLink = `https://github.com/esphome/esphome/tree/dev/esphome/components/${integrationName}`;
  const filter = encodeURIComponent(`is:pr label:${labelName}`);
  const prsLink = `https://github.com/esphome/esphome/pulls?q=${filter}`;

  const commentBody = `[${integrationName} source](${codeLink})\n[${integrationName} recent changes](${prsLink})`;

  context.log(NAME, `Adding comment with links ${commentBody}`);
  scheduleComment(context, "IssueLinks", commentBody);
};
