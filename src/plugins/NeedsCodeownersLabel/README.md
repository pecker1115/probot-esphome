# Needs Codeowners label

* Repository: `esphome`
* Type: PR

## Purpose

Maintains the `needs-codeowners` label and informs users how to add/edit codeowners.

## Logic

* Adds `needs-codeowners` label to PRs that are labeled `new-integration` and `CODEOWNERS` file not updated.
* Removes `needs-codeowners` when `new-integration` label is removed or `CODEOWNERS` file edited.
* Writes a comment when `needs-codeowners` label is added.
