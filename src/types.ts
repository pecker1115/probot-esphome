import { Context, ProbotOctokit } from "probot";
import { EmitterWebhookEventName } from "@octokit/webhooks/dist-types/types";
import { Endpoints } from "@octokit/types";
import { Issue, PullRequest } from "@octokit/webhooks-types";

export type PRContext = Context<"pull_request">;
export type IssueContext = Context<"issues">;
export type IssueOrPRContext = Context<"pull_request"> | Context<"issues">;
export type LabeledPRContext = Context<"pull_request.labeled">;
export type LabeledOrUnlabeledPRContext =
  | Context<"pull_request.labeled">
  | Context<"pull_request.unlabeled">;
export type LabeledIssueOrPRContext =
  | Context<"pull_request.labeled">
  | Context<"issues.labeled">;
export type Octokit = InstanceType<typeof ProbotOctokit>;
export type WebhookEvents = EmitterWebhookEventName;

export type PullsListFilesResponse =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"]["response"]["data"];
export type PullsListFilesResponseItem = PullsListFilesResponse[0];

export type IssueOrPullRequest = Issue | PullRequest;
