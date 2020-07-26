import { Octokit } from "@octokit/rest";
import { entityComponents, coreComponents } from "../const";

export class ParsedDocsPath {
  public file: Octokit.PullsListFilesResponseItem;
  public type:
    | "integration"
    | "core"
    | "cookbook"
    | "devices"
    | "guides"
    | null = null;
  public component: null | string = null;
  public platform: null | string = null;

  constructor(file: Octokit.PullsListFilesResponseItem) {
    this.file = file;
    const parts = file.filename.split("/");
    if (parts.length === 0) {
      return;
    }

    const subfolder = parts.shift();
    if (subfolder === "cookbook") {
      this.type = "cookbook";
      return;
    } else if (subfolder === "devices") {
      this.type = "devices";
      return;
    } else if (subfolder === "guides") {
      this.type = "guides";
      return;
    } else if (subfolder !== "components") {
      this.type = "core";
      return;
    }

    this.type = "integration";

    const comp = parts.shift().replace(".rst", "");

    if (parts.length !== 0) {
      const platform = parts.shift().replace(".rst", "");

      if (entityComponents.includes(comp)) {
        this.platform = comp;
        this.component = platform;
        return;
      }

      this.component = comp;
      return;
    }

    this.component = comp;
  }
}
