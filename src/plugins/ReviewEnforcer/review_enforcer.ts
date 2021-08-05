import { PRContext } from "../../types";
import { Probot } from "probot";
import {
  filterEventByRepo,
  extractRepoFromContext,
} from "../../util/filter_event_repo";
import { REPO_CORE, REPO_DOCS } from "../../const";
import { fetchPullRequestFilesFromContext } from "../../util/pull_request";
import { ParsedPath } from "../../util/parse_path";
import { ParsedDocsPath } from "../../util/parse_docs_path";
import { scheduleComment } from "../../util/comment";

const NAME = "ReviewEnforcer";

const USERS = [];

const INTEGRATIONS = ["xiaomi_miio"];

const commentBody = `This pull request needs to be manually signed off by @home-assistant/core before it can get merged.`;

export const initReviewEnforcer = (app: Probot) => {
  app.on("pull_request.opened", runReviewEnforcer as any);
};

const runReviewEnforcer = async (context: PRContext) => {
  if (context.isBot) {
    return;
  }
  if (USERS.includes(context.payload.sender.login)) {
    await markForReview(context);
    return;
  }

  const repo = extractRepoFromContext(context);

  if (repo === REPO_CORE) {
    await checkPythonPRFiles(context);
  } else if (repo === REPO_DOCS) {
    await checkDocsPRFiles(context);
  }
};

const checkDocsPRFiles = async (context: PRContext) => {
  const files = await fetchPullRequestFilesFromContext(context);
  const parsed = files.map((file) => new ParsedDocsPath(file));

  if (
    parsed.some(
      (file) => file.component && INTEGRATIONS.includes(file.component)
    )
  ) {
    await markForReview(context);
  }
};

const checkPythonPRFiles = async (context: PRContext) => {
  const files = await fetchPullRequestFilesFromContext(context);
  const parsed = files.map((file) => new ParsedPath(file));

  if (
    parsed.some(
      (file) => file.component && INTEGRATIONS.includes(file.component)
    )
  ) {
    await markForReview(context);
  }
};

const markForReview = async (context: PRContext) => {
  await scheduleComment(context, "ReviewEnforcer", commentBody);
};
