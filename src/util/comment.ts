/**
 * Helper to leave a comment on a PR.
 *
 * We debounce it so that we only leave 1 comment with all notices.
 */
import { COMMENT_DEBOUNCE_TIME } from "../const";
import { PRContext, IssueContext, IssueOrPRContext } from "../types";
import { getIssueFromPayload } from "./issue";
import { debounce } from "./debounce";

type PendingComment = {
  debouncedPost: Function;
  context: IssueOrPRContext;
  comments: Array<{ handler: string; message: string }>;
};

const pendingComments = new Map<string, PendingComment>();

async function postComment(key: string): Promise<void> {
  const pendingComment = pendingComments.get(key);
  pendingComments.delete(key);

  const context = pendingComment.context;

  // Group messages by handler in alphabetical order
  const handlers = new Set(pendingComment.comments.map((c) => c.handler));
  const toPost = [...handlers].sort().map(
    (handler) =>
      `${pendingComment.comments
        .filter((comment) => comment.handler === handler)
        .map((comment) => comment.message)
        .join("\n")}\n` + `<sub><sup>(message by ${handler})</sup></sub>`
  );

  const commentBody = toPost.join("\n\n---\n\n");

  context.log.info(`Posting comment on ${context.issue().issue_number}`);
  await context.octokit.issues.createComment(
    context.issue({ body: commentBody })
  );
};

export const scheduleComment = async (
  context: IssueOrPRContext,
  handler: string,
  message: string
) => {
  const key = getIssueFromPayload(context).url;
  if (!pendingComments.has(key)) {
    pendingComments.set(key, {
      debouncedPost: debounce(() => postComment(key), COMMENT_DEBOUNCE_TIME),
      context,
      comments: [],
    });
  }

  const pendingComment = pendingComments.get(key);
  pendingComment.comments.push({ handler, message });
  await pendingComment.debouncedPost();
};
