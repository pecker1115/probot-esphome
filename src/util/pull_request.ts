import { PRContext } from "../types";
import { GitHubAPI } from "probot/lib/github";
import { Octokit } from "@octokit/rest";

export const fetchPRWithCache = async (
  github: GitHubAPI,
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
): Promise<Octokit.PullsListFilesResponse> => {
  return context.github.pulls
    .listFiles(context.issue())
    .then(({ data }) => data);
};

export const getPRState = (pr: { state: string; merged: boolean }) =>
  pr.state === "open" ? "open" : pr.merged ? "merged" : "closed";
