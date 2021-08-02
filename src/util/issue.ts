import { IssueOrPRContext, Octokit, IssueOrPullRequest } from "../types";

export const fetchIssueWithCache = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  number: number
) => {
  return octokit.issues
    .get({
      owner,
      repo,
      issue_number: number,
    })
    .then(({ data }) => data);
};

// PRs are shaped as issues. This method will help normalize it.
export const getIssueFromPayload = (
  context: IssueOrPRContext
): IssueOrPullRequest => {
  if (context.name === "issues") {
    return context.payload["issue"];
  }
  if (context.name === "pull_request") {
    return context.payload["pull_request"];
  }
  throw new Error(`Unable to get issue for ${context.name} context`);
};
