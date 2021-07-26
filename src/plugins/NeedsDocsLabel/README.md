# Needs docs label

* Repository: `esphome`
* Type: PR

## Purpose

Maintains the `needs-docs` label on PRs.

## Logic

* Add `needs-docs` label when a PR is labeled `new-integration` and there is no link to a docs PR in the description.
* Remove `need-docs` label when a link to a docs PR is added to the description.
