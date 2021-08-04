import { Probot } from "probot";
import { PRContext } from "../../types";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { filterEventNoBot } from "../../util/filter_event_no_bot";
import { REPO_DOCS, ORG_ESPHOME } from "../../const";
import {
  extractIssuesOrPullRequestMarkdownLinks,
  extractPullRequestURLLinks,
} from "../../util/text_parser";
import { getIssueFromPayload } from "../../util/issue";
import { scheduleComment } from "../../util/comment";

const NAME = "DocsTargetBranch";

export const bodyShouldTargetCurrent: string =
  "It seems that this PR is targeted against an incorrect branch. Documentation updates which apply to our current stable release should target the `current` branch. Please change the target branch of this PR to `current` and rebase if needed. If this is documentation for a new feature, please add a link to that PR in your description.";
export const bodyShouldTargetNext: string =
  "It seems that this PR is targeted against an incorrect branch since it has a parent PR on one of our codebases. Documentation that needs to be updated for an upcoming release should target the `next` branch. Please change the target branch of this PR to `next` and rebase if needed.";

export const initDocsTargetBranch = (app: Probot) => {
  app.on(
    ["pull_request.opened", "pull_request.edited"],
    filterEventNoBot(
      NAME,
      filterEventByRepo(NAME, [REPO_DOCS], runDocsTargetBranch)
    )
  );
};

export const runDocsTargetBranch = async (context: PRContext) => {
  const log = context.log.child({ name: NAME });
  const target = context.payload.pull_request.base.ref;
  const links = extractIssuesOrPullRequestMarkdownLinks(
    context.payload.pull_request.body
  ).concat(
    extractPullRequestURLLinks(context.payload.pull_request.body).filter(
      (link) => ORG_ESPHOME !== link.owner
    )
  );

  log.debug(`Found ${links.length} links`);

  if (links.length === 0) {
    if (target !== "current") {
      await wrongTargetBranchDetected(context, "current");
    } else {
      await correctTargetBranchDetected(context);
    }
    return;
  }

  if (target !== "next") {
    await wrongTargetBranchDetected(context, "next");
  } else {
    await correctTargetBranchDetected(context);
  }
};

const correctTargetBranchDetected = async (context: PRContext) => {
  const pr = getIssueFromPayload(context);
  const author = context.payload.sender.login;
  const promises: Promise<unknown>[] = [];
  const currentLabels = pr.labels.map((label) => label.name);
  if (currentLabels.includes("wrong-base-branch")) {
    promises.push(
      context.octokit.issues.removeLabel(
        // Bug in Probot: https://github.com/probot/probot/issues/917
        // @ts-ignore
        context.issue({
          label: "wrong-base-branch",
        })
      )
    );
  }
};

const wrongTargetBranchDetected = async (
  context: PRContext,
  correctTargetBranch: "current" | "next"
) => {
  const log = context.log.child({ name: NAME });
  const labels = ["wrong-base-branch", "in-progress"];
  const promises: Promise<unknown>[] = [];
  const body: string =
    correctTargetBranch === "next"
      ? bodyShouldTargetNext
      : bodyShouldTargetCurrent;
  const pr = getIssueFromPayload(context);

  const currentLabels = pr.labels.map((label) => label.name);
  if (currentLabels.includes("wrong-base-branch")) {
    // If the label "wrong-base-branch" already exsist we can assume that this action has run,
    // and we should ignore it.
    return;
  }

  log.info(`Adding ${labels} to PR`);
  promises.push(
    context.octokit.issues.addLabels(
      // Bug in Probot: https://github.com/probot/probot/issues/917
      // @ts-ignore
      context.issue({
        labels,
      })
    )
  );

  log.info(`Adding comment to ${context.payload.pull_request.number}: ${body}`);

  scheduleComment(context, "DocsTargetBranch", body);

  await Promise.all(promises);
};
