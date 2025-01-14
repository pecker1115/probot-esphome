import { fetchPullRequestFilesFromContext } from "../../util/pull_request";
import { PRContext } from "../../types";
import { Probot } from "probot";
import { filterEventByRepo } from "../../util/filter_event_repo";
import { REPO_CORE } from "../../const";
import { filterEventNoBot } from "../../util/filter_event_no_bot";

const NAME = "DependencyBump";

const DEPENDENCY_FILES = [
  "setup.py",
  "manifest.json",
  "package_constraints.txt",
  "requirements_all.txt",
  "requirements_docs.txt",
  "requirements_test.txt",
  "requirements_test_all.txt",
];

export const initDependencyBump = (app: Probot) => {
  app.on(
    ["pull_request.opened"],
    filterEventNoBot(
      NAME,
      filterEventByRepo(NAME, [REPO_CORE], runDependencyBump)
    )
  );
};

const runDependencyBump = async (context: PRContext) => {
  const log = context.log.child({ name: NAME });
  const files = await fetchPullRequestFilesFromContext(context);
  const filenames = files.map((file) => {
    const parts = file.filename.split("/");
    return parts[parts.length - 1];
  });

  if (!filenames.every((filename) => DEPENDENCY_FILES.includes(filename))) {
    return;
  }

  log.info("Adding label dependency-bump");
  await context.octokit.issues.addLabels(
    context.issue({ labels: ["dependency-bump"] })
  );
};
