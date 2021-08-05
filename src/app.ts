import { Probot } from "probot";
import { initLabelBot } from "./plugins/LabelBot/label_bot";
import { initNeedsDocsLabel } from "./plugins/NeedsDocsLabel/needs_docs_label";
import { initIssueLinks } from "./plugins/IssueLinks/issue_links";
import { initCodeOwnersMention } from "./plugins/CodeOwnersMention/code_owners_mention";
import { initReviewEnforcer } from "./plugins/ReviewEnforcer/review_enforcer";
import { initDocsParenting } from "./plugins/DocsParenting/docs_parenting";
import { initDocsTargetBranch } from "./plugins/DocsTargetBranch/docs_target_branch";
import { initLabelCleaner } from "./plugins/LabelCleaner/label_cleaner";
import { initDocsBranchLabels } from "./plugins/DocsBranchLabels/docs_branch_labels";
import { initDocsMissing } from "./plugins/DocsMissing/docs_missing";
import { initHacktoberfest } from "./plugins/Hacktoberfest/hacktoberfest";
import { initDependencyBump } from "./plugins/DependencyBump/dependency_bump";
import { initNeedsCodeownersLabel } from "./plugins/NeedsCodeownersLabel/needs_codeowners_label";

export function initApp(app: Probot): void {
  initLabelBot(app);
  initNeedsDocsLabel(app);
  initCodeOwnersMention(app);
  // disabled - not really useful
  // initIssueLinks(app);
  // Not needed
  // initReviewEnforcer(app);
  initDocsParenting(app);

  // heuristic is bad
  //initDocsTargetBranch(app);

  initLabelCleaner(app);
  initDocsBranchLabels(app);
  initDocsMissing(app);

  // initHacktoberfest(app);
  // not needed
  // initDependencyBump(app);
  initNeedsCodeownersLabel(app);
}
