import { entityComponents, coreComponents } from "../const";
import { basename } from "path";
import { PullsListFilesResponseItem } from "../types";

export class ParsedPath {
  public file: PullsListFilesResponseItem;
  public type:
    | null
    | "core"
    | "dashboard"
    | "scripts"
    | "test"
    | "component"
    | "platform" = null;
  public component: null | string = null;
  public platform: null | string = null;
  public core = false;

  constructor(file: PullsListFilesResponseItem) {
    this.file = file;
    const parts = file.filename.split("/");
    const rootFolder = parts.length > 1 ? parts.shift() : undefined;

    if (rootFolder === "script") {
      this.type = "scripts";
      this.core = true;
      return;
    }
    if (rootFolder === "tests") {
      this.type = "test";
      return;
    }

    if (rootFolder !== "esphome") {
      return;
    }

    const subfolder = parts.shift();

    if (subfolder === "dashboard") {
      this.core = true;
      this.type = "dashboard";
      return;
    }

    if (subfolder !== "components") {
      this.core = true;
      this.type = "core";
      return;
    }

    if (parts.length < 2) {
      return;
    }

    this.component = parts.shift();
    let filename = parts[0].replace(".py", "");

    if (entityComponents.includes(filename)) {
      this.type = "platform";
      this.platform = filename;
    } else {
      this.type = "component";
    }

    this.core = coreComponents.includes(this.component);
  }

  get additions() {
    return this.file.additions;
  }

  get status() {
    return this.file.status;
  }

  get path() {
    return this.file.filename;
  }

  get filename() {
    return basename(this.path);
  }
}
