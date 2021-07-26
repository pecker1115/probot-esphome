import { PRContext } from "../../../types";
import { ParsedPath } from "../../../util/parse_path";

// This must run after newIntegrationOrPlatform and hasTests
export default function(context: PRContext, parsed: ParsedPath[], labels: Set<string>) {
  return labels.has("new-integration") && !labels.has("has-tests") ? ["needs-tests"] : [];
}
