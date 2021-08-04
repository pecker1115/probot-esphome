import { Context } from "probot";
import { Repository } from "@octokit/webhooks-types";
import { WebhookEvents } from "../types";
import { ProbotWebhooks } from "probot/lib/types";

export const extractRepoFromContext = (context: any): string | undefined => {
  let repo: string | undefined;
  const anyContext = context as any;

  // PayloadWithRepository events
  if (anyContext.payload && anyContext.payload.repository) {
    repo = (anyContext.payload.repository as Repository).name;
    // The other events
  } else if (anyContext.repository) {
    const fullRepo = anyContext.repository;
    repo = fullRepo.substr(fullRepo.indexOf("/") + 1);
  }
  return repo;
};

export const filterEventByRepo = (
  name: string,
  allowRepositories: string[],
  handler: (context: any) => Promise<void>
): ((context: any) => Promise<void>) => {
  // Wrapped handler function
  return async (context: Context) => {
    const repo = extractRepoFromContext(context);

    if (!repo) {
      context.log.debug(
        `${name}: Skipping event because it has no repository.`
      );
      return;
    }

    const repoName = repo.substr(repo.indexOf("/") + 1);

    if (allowRepositories.indexOf(repoName) == -1) {
      context.log.debug(
        `${name}: Skipping event because repository ${repoName} does not match.`
      );
      return;
    }

    await handler(context as any);
  };
};
