import {
  PRContext,
  Octokit,
  PullsListFilesResponseItem,
  PullsListFilesResponse,
} from "../types";

export const fetchPRWithCache = async (
  github: Octokit,
  owner: string,
  repo: string,
  number: number
) => {
  return github.pulls
    .get({
      owner,
      repo,
      pull_number: number,
    })
    .then(({ data }) => data);
};

export const fetchPullRequestFilesFromContext = (
  context: PRContext
): Promise<PullsListFilesResponse> => {
  return context.octokit.pulls
    .listFiles(context.pullRequest())
    .then(({ data }) => data);
};

export const getPRState = (pr: { state: string; merged: boolean }) =>
  pr.state === "open" ? "open" : pr.merged ? "merged" : "closed";
