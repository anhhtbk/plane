/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it } from "vitest";
import type { TWorkItemFilterExpression } from "@plane/types";
import { FilterInstance } from "../rich-filters/filter";
import { workItemFiltersAdapter } from "./adapter";
import type { TWorkItemCreatePrefillContext } from "./create-prefill";
import { getWorkItemCreatePrefill } from "./create-prefill";

const context: TWorkItemCreatePrefillContext = {
  states: [
    { id: "backlog-1", group: "backlog", sequence: 1000, default: false },
    { id: "todo-0", group: "unstarted", sequence: 1500, default: false },
    { id: "todo-1", group: "unstarted", sequence: 2000, default: true },
    { id: "doing-1", group: "started", sequence: 3000, default: false },
    { id: "doing-2", group: "started", sequence: 2500, default: false },
    { id: "done-1", group: "completed", sequence: 4000, default: false },
  ],
  validCycleIds: ["cycle-current", "cycle-upcoming"],
  validModuleIds: ["module-a", "module-b"],
  validLabelIds: ["label-bug", "label-ui"],
  memberIds: ["user-ann", "user-bob"],
};

/**
 * Prefill from the active conditions exactly as the filter row exposes them for an applied expression.
 */
const prefill = (expression: TWorkItemFilterExpression, ctx: TWorkItemCreatePrefillContext = context) =>
  getWorkItemCreatePrefill(
    new FilterInstance({ adapter: workItemFiltersAdapter, initialExpression: expression }).allConditions,
    ctx
  );

describe("getWorkItemCreatePrefill", () => {
  it("assigns every filtered project member", () => {
    expect(prefill({ assignee_id__in: "user-ann,user-bob" })).toEqual({ assignee_ids: ["user-ann", "user-bob"] });
  });

  it("applies every filtered label and module", () => {
    expect(prefill({ and: [{ label_id__in: "label-bug,label-ui" }, { module_id__in: "module-a,module-b" }] })).toEqual({
      label_ids: ["label-bug", "label-ui"],
      module_ids: ["module-a", "module-b"],
    });
  });

  it("keeps a single filtered value of a multi-value field as a one-item list", () => {
    expect(prefill({ label_id__exact: "label-ui" })).toEqual({ label_ids: ["label-ui"] });
  });

  it("silently skips non-members, unknown/archived labels and modules, and None, keeping the usable rest", () => {
    expect(
      prefill({
        and: [
          { assignee_id__in: "user-gone,None,user-bob" },
          { label_id__in: "label-archived,label-bug,null" },
          { module_id__in: "module-archived,module-b" },
        ],
      })
    ).toEqual({ assignee_ids: ["user-bob"], label_ids: ["label-bug"], module_ids: ["module-b"] });
  });

  it("returns nothing for a multi-value field whose filtered values are all unusable", () => {
    expect(prefill({ and: [{ assignee_id__in: "None,user-gone" }, { module_id__in: "module-archived" }] })).toEqual({});
  });

  it("sets state, priority and cycle when each is filtered to exactly one value", () => {
    expect(
      prefill({ and: [{ state_id__in: "doing-1" }, { priority__in: "high" }, { cycle_id__exact: "cycle-current" }] })
    ).toEqual({ state_id: "doing-1", priority: "high", cycle_id: "cycle-current" });
  });

  it("leaves state, priority and cycle to the form defaults when several values are filtered", () => {
    expect(
      prefill({
        and: [
          { state_id__in: "todo-1,doing-1" },
          { priority__in: "high,urgent" },
          { cycle_id__in: "cycle-current,cycle-upcoming" },
        ],
      })
    ).toEqual({});
  });

  it("decides a single-value field on the values left after dropping unusable ones and None", () => {
    expect(
      prefill({
        and: [
          { state_id__in: "state-deleted,doing-1" },
          { priority__in: "none,low" },
          { cycle_id__in: "cycle-completed,cycle-upcoming,None" },
        ],
      })
    ).toEqual({ state_id: "doing-1", priority: "low", cycle_id: "cycle-upcoming" });
  });

  it("does not prefill a priority filtered only by None", () => {
    expect(prefill({ priority__in: "none" })).toEqual({});
  });

  it("combines repeated conditions with AND: union for multi-value fields, common value for single-value fields", () => {
    expect(
      prefill({
        and: [
          { assignee_id__in: "user-ann" },
          { assignee_id__in: "user-bob,user-ann" },
          { state_id__in: "todo-1,doing-1" },
          { state_id__exact: "doing-1" },
        ],
      })
    ).toEqual({ assignee_ids: ["user-ann", "user-bob"], state_id: "doing-1" });
  });

  it("ignores dates, people other than assignees, timestamps and project", () => {
    expect(
      prefill({
        and: [
          { start_date__range: "2026-10-01,2026-10-31" },
          { target_date__range: "2026-10-01,2026-10-31" },
          { created_by_id__in: "user-ann" },
          { mention_id__in: "user-ann" },
          { subscriber_id__in: "user-ann" },
          { created_at__range: "2026-10-01,2026-10-31" },
          { updated_at__range: "2026-10-01,2026-10-31" },
          { project_id__in: "project-1" },
        ],
      })
    ).toEqual({});
  });

  it("returns an empty prefill when no filter is applied", () => {
    expect(prefill({})).toEqual({});
  });

  describe("title", () => {
    it("prefills the title with the filtered text, trimmed, so a title-only filter has a prefill", () => {
      expect(prefill({ name__icontains: "  Login, SSO & 50%_done " })).toEqual({ name: "Login, SSO & 50%_done" });
    });

    it("keeps the title alongside the other prefilled fields", () => {
      expect(prefill({ and: [{ name__icontains: "login" }, { assignee_id__in: "user-ann" }] })).toEqual({
        name: "login",
        assignee_ids: ["user-ann"],
      });
    });

    it("does not prefill a title filtered only by whitespace", () => {
      expect(prefill({ name__icontains: "   " })).toEqual({});
    });

    it("does not guess a title when several title conditions are filtered", () => {
      expect(prefill({ and: [{ name__icontains: "login" }, { name__icontains: "payment" }] })).toEqual({});
    });
  });

  describe("state group", () => {
    it("uses the project default state when it belongs to the only filtered group", () => {
      expect(prefill({ state_group__in: "unstarted" })).toEqual({ state_id: "todo-1" });
    });

    it("uses the lowest-sequence state of the group when the default state is in another group", () => {
      expect(prefill({ state_group__exact: "started" })).toEqual({ state_id: "doing-2" });
    });

    it("uses the one group left after intersecting repeated group conditions", () => {
      expect(prefill({ and: [{ state_group__in: "started,completed" }, { state_group__in: "started" }] })).toEqual({
        state_id: "doing-2",
      });
    });

    it("leaves state to the form default when several groups are filtered", () => {
      expect(prefill({ state_group__in: "backlog,started" })).toEqual({});
    });

    it("leaves state to the form default when the filtered group has no state in the project", () => {
      expect(prefill({ state_group__in: "cancelled" })).toEqual({});
    });

    it("lets a usable state filter decide over the group", () => {
      expect(prefill({ and: [{ state_group__in: "unstarted" }, { state_id__in: "doing-1" }] })).toEqual({
        state_id: "doing-1",
      });
    });

    it("does not use the group when the usable state filter keeps several states", () => {
      expect(prefill({ and: [{ state_group__in: "started" }, { state_id__in: "todo-1,doing-1" }] })).toEqual({});
    });

    it("does not use the group when usable state conditions share no state", () => {
      expect(
        prefill({ and: [{ state_group__in: "started" }, { state_id__in: "todo-1" }, { state_id__in: "doing-1" }] })
      ).toEqual({});
    });

    it("falls back to the group when the state filter has no usable value", () => {
      expect(prefill({ and: [{ state_group__in: "started" }, { state_id__in: "state-deleted" }] })).toEqual({
        state_id: "doing-2",
      });
    });
  });
});
