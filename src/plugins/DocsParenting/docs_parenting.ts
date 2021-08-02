import { PRContext } from "../../types";
import { Probot } from "probot";
import { extractRepoFromContext } from "../../util/filter_event_repo";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { REPO_DOCS, ORG_ESPHOME } from "../../const";
import { getIssueFromPayload } from "../../util/issue";
import {
  extractIssuesOrPullRequestMarkdownLinks,
  extractPullRequestURLLinks,
} from "../../util/text_parser";
import { getPRState } from "../../util/pull_request";

const NAME = "DocsParenting";

export const initDocsParenting = (app: Probot) => {
  app.on(["pull_request.opened", "pull_request.edited"], async (context) => {
    if (extractRepoFromContext(context) === REPO_DOCS) {
      await runDocsParentingDocs(context);
    } else {
      await runDocsParentingNonDocs(context);
    }
  });
  app.on(
    ["pull_request.reopened", "pull_request.closed"],
    filterEventByRepo(NAME, [REPO_DOCS], updateDocsParentStatus)
  );
};

// Deal with PRs on core repo
const runDocsParentingNonDocs = async (context: PRContext) => {
  const triggerIssue = getIssueFromPayload(context);
  context.log(
    NAME,
    "CORE PR",
    `Running on ${context.payload.repository.name}#${triggerIssue.number}`
  );

  const linksToDocs = extractIssuesOrPullRequestMarkdownLinks(triggerIssue.body)
    .concat(extractPullRequestURLLinks(triggerIssue.body))
    .filter((link) => link.repo === REPO_DOCS);

  context.log(NAME, "CORE PR", `Found ${linksToDocs.length} links to doc PRs`);

  if (linksToDocs.length === 0) {
    return;
  }

  if (linksToDocs.length > 2) {
    context.log(
      NAME,
      "CORE PR",
      "Not adding has-parent label because core PR has more than 2 links to docs PRs."
    );
    return;
  }

  context.log(
    NAME,
    "CORE PR",
    `Adding has-parent label to docs#${linksToDocs
      .map((link) => link.number)
      .join(", ")}`
  );

  await Promise.all([
    linksToDocs.map((link) =>
      context.octokit.issues.addLabels({
        ...link.issue(),
        labels: ["has-parent"],
      })
    ),
  ]);
};

// Deal with PRs on Home Assistant.io repo
const runDocsParentingDocs = async (context: PRContext) => {
  const triggerIssue = getIssueFromPayload(context);
  context.log(NAME, "DOCS PR", `Running on docs#${triggerIssue.number}`);

  const linksToNonDocs = extractIssuesOrPullRequestMarkdownLinks(
    triggerIssue.body
  )
    .concat(extractPullRequestURLLinks(triggerIssue.body))
    .filter((link) => link.owner === ORG_ESPHOME && link.repo !== REPO_DOCS);

  context.log(
    NAME,
    "DOCS PR",
    `Found ${linksToNonDocs.length} links to non-doc PRs`
  );

  if (linksToNonDocs.length === 0) {
    return;
  }

  context.log(
    NAME,
    "DOCS PR",
    `Adding has-parent label to docs#${triggerIssue.number}`
  );

  await context.octokit.issues.addLabels(
    context.issue({
      labels: ["has-parent"],
    })
  );
};

/**
 * Goal is to reflect the parent status on the docs PR.
 *  - parent opened: make sure docs PR is open
 *  - parent closed: make sure docs PR is closed
 *  - parent merged: add label "parent-merged"
 */
const updateDocsParentStatus = async (context: PRContext) => {
  const log = (msg: string) => context.log(NAME, "PARENT PR", msg);

  const pr = context.payload.pull_request;
  log(`Running on docs#${pr.number}`);

  const linksToDocs = extractIssuesOrPullRequestMarkdownLinks(pr.body).filter(
    (link) => link.repo === REPO_DOCS
  );

  log(`PR contains ${linksToDocs.length} links to doc PRs`);

  if (linksToDocs.length !== 1) {
    if (linksToDocs.length > 1) {
      log(`Not doing work because more than 1 link found.`);
    }
    return;
  }

  const docLink = linksToDocs[0];
  const parentState = getPRState(pr);

  if (parentState === "open") {
    // Parent is open, docs issue should be open too.
    const docsPR = await docLink.fetchPR(context.octokit);
    const docsPRState = getPRState(docsPR);

    if (docsPRState === "open") {
      log(
        `Parent got opened, docs PR ${docLink.number} is already open. Not doing work`
      );
      return;
    }

    if (docsPRState === "merged") {
      log(`Parent got opened but docs PR ${docLink.number} is already merged.`);
      return;
    }

    // docs PR state == closed
    log(`Parent got opened, opening docs PR ${docLink.number}.`);
    await context.octokit.pulls.update({
      ...docLink.pull(),
      state: "open",
    });
    return;
  }

  if (parentState === "closed") {
    log(`Parent got closed, closing docs PR ${docLink.number}`);
    await context.octokit.pulls.update({
      ...docLink.pull(),
      state: "closed",
    });
    return;
  }

  // Parent state == merged
  log(`Adding parent-merged label to doc PR ${docLink.number}`);

  await context.octokit.issues.addLabels({
    ...docLink.issue(),
    labels: ["parent-merged"],
  });
};
