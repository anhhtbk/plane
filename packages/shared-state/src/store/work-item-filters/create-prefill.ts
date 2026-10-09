/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// plane imports
import { STATE_GROUPS } from "@plane/constants";
import type {
  TFilterConditionNode,
  TFilterValue,
  TIssue,
  TIssuePriorities,
  TStateGroups,
  TWorkItemFilterProperty,
} from "@plane/types";
import { COLLECTION_OPERATOR, EQUALITY_OPERATOR } from "@plane/types";

/**
 * A project state as needed to resolve the state of a work item created from filters.
 */
export type TWorkItemCreatePrefillState = {
  id: string;
  group: TStateGroups;
  sequence: number;
  default: boolean;
};

/**
 * Project data the prefill validates filter values against.
 * - states: all states of the project
 * - validCycleIds: cycles a new work item can join (not completed, not archived)
 * - validModuleIds: modules a new work item can join (not archived)
 * - validLabelIds: labels of the project
 * - memberIds: project members a work item can be assigned to
 * - route: the cycle/module of the page the work item is created from, if any
 */
export type TWorkItemCreatePrefillContext = {
  states: TWorkItemCreatePrefillState[];
  validCycleIds: string[];
  validModuleIds: string[];
  validLabelIds: string[];
  memberIds: string[];
  route?: {
    cycleId?: string;
    moduleId?: string;
  };
};

/**
 * Work item values the create form is prefilled with. Only decided keys are present; an empty object
 * means nothing can be prefilled.
 */
export type TWorkItemCreatePrefill = Partial<
  Pick<TIssue, "assignee_ids" | "label_ids" | "module_ids" | "state_id" | "priority" | "cycle_id">
>;

type TPrefillCondition = TFilterConditionNode<TWorkItemFilterProperty, TFilterValue>;

const SELECTION_OPERATORS: Record<string, true> = {
  [EQUALITY_OPERATOR.EXACT]: true,
  [COLLECTION_OPERATOR.IN]: true,
};

/** Priorities a work item can be created with from a filter; "none" is the form default, not a choice. */
const PREFILLABLE_PRIORITIES: Record<string, true> = { urgent: true, high: true, medium: true, low: true };

/**
 * Collects the usable values of every selection condition on `property`, one list per condition.
 * Values outside `isValid` ("None", deleted/archived/completed entities, non-members) are dropped, and
 * conditions left without a usable value are skipped. Other operators are ignored.
 */
const getUsableValuesPerCondition = <T extends string>(
  conditions: readonly TPrefillCondition[],
  property: TWorkItemFilterProperty,
  isValid: (value: string) => value is T
): T[][] =>
  conditions
    .filter((condition) => condition.property === property && SELECTION_OPERATORS[condition.operator])
    .map((condition) =>
      (Array.isArray(condition.value) ? condition.value : [condition.value]).filter(
        (value): value is T => typeof value === "string" && isValid(value)
      )
    )
    .filter((values) => values.length > 0);

/**
 * Values for a multi-value work item field: every usable value of every condition, deduplicated.
 */
const getMultiValue = (
  conditions: readonly TPrefillCondition[],
  property: TWorkItemFilterProperty,
  validIds: readonly string[]
): string[] | undefined => {
  const values = [
    ...new Set(getUsableValuesPerCondition(conditions, property, (id): id is string => validIds.includes(id)).flat()),
  ];
  return values.length > 0 ? values : undefined;
};

/**
 * Value for a single-value work item field: the one usable value every condition allows, if exactly one.
 */
const getSingleValue = <T extends string>(
  conditions: readonly TPrefillCondition[],
  property: TWorkItemFilterProperty,
  isValid: (value: string) => value is T
): T | undefined => {
  const [first, ...rest] = getUsableValuesPerCondition(conditions, property, isValid);
  if (!first) return undefined;
  const allowed = [...new Set(first)].filter((value) => rest.every((values) => values.includes(value)));
  return allowed.length === 1 ? allowed[0] : undefined;
};

/**
 * State for a work item filtered to exactly one state group: the project default state if it is in
 * that group, otherwise the group's lowest-sequence state. None when the group has no state.
 */
const getStateIdFromGroup = (
  conditions: readonly TPrefillCondition[],
  states: readonly TWorkItemCreatePrefillState[]
): string | undefined => {
  const group = getSingleValue(conditions, "state_group", (value): value is TStateGroups =>
    Object.keys(STATE_GROUPS).includes(value)
  );
  if (!group) return undefined;
  const groupStates = states.filter((state) => state.group === group);
  const defaultState = groupStates.find((state) => state.default);
  if (defaultState) return defaultState.id;
  return groupStates.reduce<TWorkItemCreatePrefillState | undefined>(
    (first, state) => (!first || state.sequence < first.sequence ? state : first),
    undefined
  )?.id;
};

/**
 * Builds the create work item prefill from the active filter conditions of a project work item list.
 * @param conditions - active filter conditions (the filter instance's `allConditions`)
 * @param context - project data used to validate filter values
 * @returns the work item values to prefill; empty when no condition can be used
 */
export const getWorkItemCreatePrefill = (
  conditions: readonly TPrefillCondition[],
  context: TWorkItemCreatePrefillContext
): TWorkItemCreatePrefill => {
  const prefill: TWorkItemCreatePrefill = {};

  const assigneeIds = getMultiValue(conditions, "assignee_id", context.memberIds);
  if (assigneeIds) prefill.assignee_ids = assigneeIds;

  const labelIds = getMultiValue(conditions, "label_id", context.validLabelIds);
  if (labelIds) prefill.label_ids = labelIds;

  const moduleIds = getMultiValue(conditions, "module_id", context.validModuleIds);
  if (moduleIds) prefill.module_ids = moduleIds;

  // a usable state filter decides; the state group is used only without one
  const stateId =
    getSingleValue(conditions, "state_id", (id): id is string => context.states.some((state) => state.id === id)) ??
    getStateIdFromGroup(conditions, context.states);
  if (stateId) prefill.state_id = stateId;

  const priority = getSingleValue(
    conditions,
    "priority",
    (value): value is TIssuePriorities => PREFILLABLE_PRIORITIES[value] === true
  );
  if (priority) prefill.priority = priority;

  const cycleId = getSingleValue(conditions, "cycle_id", (id): id is string => context.validCycleIds.includes(id));
  if (cycleId) prefill.cycle_id = cycleId;

  return prefill;
};
