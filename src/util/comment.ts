/**
 * Helper to leave a comment on a PR.
 *
 * We debounce it so that we only leave 1 comment with all notices.
 */
import { debounce } from "debounce";
import { PRContext, IssueContext, IssueOrPRContext } from "../types";

type PatchedContext = (PRContext | IssueContext) & {
  _commentsToPost?: Array<{ handler: string; message: string }>;
};

const WAIT_COMMENTS = 2500; // ms

const postComment = (context: PRContext | IssueContext) => {
  const patchedContext = context as PatchedContext;
  const comments = patchedContext._commentsToPost!;

  // Can happen if race condition etc.
  if (comments.length === 0) {
    return;
  }

  // Empty it, in case probot takes longer than 300ms and this runs again.
  patchedContext._commentsToPost = [];

  const toPost = comments.map(
    (comment) =>
      `${comment.message}\n<sub><sup>(message by ${comment.handler})</sup></sub>`
  );

  let commentBody = toPost.join("\n\n---\n\n");

  context.octokit.issues.createComment(context.issue({ body: commentBody }));
};

const debouncedPostComment = debounce(postComment, WAIT_COMMENTS);

export const scheduleComment = (
  context: any,
  handler: string,
  message: string
) => {
  const patchedContext = context as PatchedContext;
  if (!("_commentsToPost" in patchedContext)) {
    patchedContext._commentsToPost = [];
  }
  context.payload.repository;
  patchedContext._commentsToPost.push({ handler, message });
  debouncedPostComment(context);
};
