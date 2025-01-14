import { fetchIssueWithCache } from "./issue";
import { fetchPRWithCache } from "./pull_request";
import { Octokit } from "../types";

interface PullOrBodyTask {
  checked: boolean;
  description: string;
}

export class ParsedGitHubIssueOrPR {
  public owner: string;
  public repo: string;
  public number: number;

  constructor(owner: string, repo: string, number: number) {
    this.owner = owner;
    this.repo = repo;
    this.number = number;
  }

  issue() {
    return {
      owner: this.owner,
      repo: this.repo,
      issue_number: this.number,
    };
  }

  pull() {
    return {
      owner: this.owner,
      repo: this.repo,
      pull_number: this.number,
    };
  }

  async fetchIssue(github: Octokit) {
    return await fetchIssueWithCache(
      github,
      this.owner,
      this.repo,
      this.number
    );
  }

  async fetchPR(github: Octokit) {
    return await fetchPRWithCache(github, this.owner, this.repo, this.number);
  }
}

export const extractPullRequestURLLinks = (body: string) => {
  const re = /https:\/\/github.com\/([\w-\.]+)\/([\w-\.]+)\/pull\/(\d+)/g;
  let match;
  const results: ParsedGitHubIssueOrPR[] = [];

  do {
    match = re.exec(body);
    if (match) {
      results.push(
        new ParsedGitHubIssueOrPR(match[1], match[2], Number(match[3]))
      );
    }
  } while (match);

  return results;
};

export const extractIssuesOrPullRequestMarkdownLinks = (body: string) => {
  const re = /([\w-\.]+)\/([\w-\.]+)#(\d+)/g;
  let match;
  const results: ParsedGitHubIssueOrPR[] = [];

  do {
    match = re.exec(body);
    if (match) {
      results.push(
        new ParsedGitHubIssueOrPR(match[1], match[2], Number(match[3]))
      );
    }
  } while (match);

  return results;
};

export const extractTasks = (body: string) => {
  const matchAll = /- \[( |)(x|X| |)(| )\] /;
  const matchChecked = /- \[( |)(x|X)(| )\] /;
  let tasks: PullOrBodyTask[] = [];

  body.split("\n").forEach((line: string) => {
    if (!line.trim().startsWith("- [")) {
      return;
    }

    const lineSplit = line.split(matchAll);
    const checked: boolean = matchChecked.test(line);
    const description: string = lineSplit[lineSplit.length - 1]
      .trim()
      .replace(/\\r/g, "");
    tasks.push({ checked, description });
  });
  return tasks;
};
