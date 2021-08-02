const codeownersUtils = require("codeowners-utils");
import { IssueOrPRContext, LabeledIssueOrPRContext } from "../../types";
import { Probot } from "probot";
import { REPO_ISSUES, REPO_CORE, ORG_ESPHOME } from "../../const";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { getIssueFromPayload } from "../../util/issue";
import { scheduleComment } from "../../util/comment";
import { Issue } from "@octokit/webhooks-types";

const NAME = "CodeOwnersMention";

export const initCodeOwnersMention = (app: Probot) => {
  app.on(
    ["issues.labeled", "pull_request.labeled"],
    filterEventByRepo(NAME, [REPO_ISSUES, REPO_CORE], runCodeOwnersMention)
  );
};

export const runCodeOwnersMention = async (
  context: LabeledIssueOrPRContext
) => {
  const labelName = context.payload.label.name;
  const triggerIssue = getIssueFromPayload(context as any);
  const triggerURL = triggerIssue.html_url;
  context.log(
    NAME,
    `Running for issue ${context.payload.repository.name}#${triggerIssue.number} and label "${labelName}"`
  );

  if (labelName.indexOf("integration: ") === -1) {
    context.log(NAME, ` -> Not an integration label.`);
    return;
  }

  context.log.debug(
    NAME,
    `Loading CODEOWNERS from ${ORG_ESPHOME}/${REPO_CORE}`
  );
  const codeownersData = await context.octokit.repos.getContent({
    owner: ORG_ESPHOME,
    repo: REPO_CORE,
    path: "CODEOWNERS",
  });

  const integrationName = labelName.split("integration: ")[1];
  context.log.debug(NAME, `Integration name: ${integrationName}`);
  const path = `esphome/components/${integrationName}/*`;
  let str = "";
  if ("content" in codeownersData.data) {
    str = Buffer.from(codeownersData.data.content, "base64").toString();
  }
  const entries = parse(str);
  const match = codeownersUtils.matchFile(path, entries);
  context.log.debug(NAME, "Matches: ", match);

  if (!match) {
    context.log(NAME, `No match found in CODEOWNERS for ${path}`);
    return;
  }

  const owners = match.owners.map(
    // Remove the `@`
    (usr) => usr.substring(1).toLowerCase()
  );

  let codeownersLine = "";
  if ("html_url" in codeownersData.data) {
    codeownersLine = `${codeownersData.data.html_url}#L${match.line}`;
  }

  // The type for the PR payload is wrong for assignees. Cast it to issue. type is the same.
  const assignees = triggerIssue.assignees.map((assignee) =>
    assignee.login.toLowerCase()
  );

  const commentersData = await context.octokit.issues.listComments(
    context.issue({ per_page: 100 })
  );
  const commenters = commentersData.data.map((commenter) =>
    commenter.user.login.toLowerCase()
  );

  const payloadUsername = triggerIssue.user.login.toLowerCase();
  const ownersMinusAuthor = owners.filter((usr) => usr !== payloadUsername);

  const promises: Promise<unknown>[] = [
    context.octokit.issues.addAssignees(
      context.issue({ assignees: ownersMinusAuthor })
    ),
  ];

  const mentions = ownersMinusAuthor
    .filter((usr) => !assignees.includes(usr) && !commenters.includes(usr))
    // Add `@` because used in a comment.
    .map((usr) => `@${usr}`);

  if (mentions.length > 0) {
    const triggerLabel = context.name === "issues" ? "issue" : "pull request";
    const commentBody = `Hey there ${mentions.join(
      ", "
    )}, mind taking a look at this ${triggerLabel} as its been labeled with an integration (\`${integrationName}\`) you are listed as a [codeowner](${codeownersLine}) for? Thanks!`;

    context.log(
      NAME,
      `Adding comment to ${triggerLabel} ${triggerURL}: ${commentBody}`
    );

    scheduleComment(context, NAME, commentBody);
  }

  // Add a label if author of issue/PR is a code owner
  if (owners.includes(payloadUsername)) {
    promises.push(
      context.octokit.issues.addLabels(
        context.issue({ labels: ["by-code-owner"] })
      )
    );
  }

  await Promise.all(promises);
};

// Temporary local patched version of whats in codeowners-utils
// until https://github.com/jamiebuilds/codeowners-utils/pull/1 is merged
function parse(str: string) {
  let entries = [];
  let lines = str.split("\n");

  lines.forEach((entry, idx) => {
    let [content, comment] = entry.split("#");
    let trimmed = content.trim();
    if (trimmed === "") return;
    let [pattern, ...owners] = trimmed.split(/\s+/);
    let line = idx + 1;
    entries.push({ pattern, owners, line });
  });

  return entries.reverse();
}
