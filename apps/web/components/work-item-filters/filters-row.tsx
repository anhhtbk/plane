/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { Button } from "@makeplane/propel/components/button";
import { Icon } from "@makeplane/propel/components/icon";
import { AddOutline } from "@makeplane/propel/icons";
// plane imports
import { EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import type { IWorkItemFilterInstance, TWorkItemCreatePrefill } from "@plane/shared-state";
import { getWorkItemCreatePrefill } from "@plane/shared-state";
import type { TIssue, TWorkItemFilterExpression, TWorkItemFilterProperty } from "@plane/types";
import { EIssuesStoreType, EUserProjectRoles } from "@plane/types";
// components
import { CreateUpdateIssueModal } from "@/components/issues/issue-modal/modal";
import type { TFiltersRowProps } from "@/components/rich-filters/filters-row";
import { FiltersRow } from "@/components/rich-filters/filters-row";
// hooks
import { useCycle } from "@/hooks/store/use-cycle";
import { useLabel } from "@/hooks/store/use-label";
import { useMember } from "@/hooks/store/use-member";
import { useModule } from "@/hooks/store/use-module";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useUserPermissions } from "@/hooks/store/user";

type TBaseWorkItemFiltersRowProps = Omit<
  TFiltersRowProps<TWorkItemFilterProperty, TWorkItemFilterExpression>,
  "trailingActions"
> & {
  filter: IWorkItemFilterInstance;
};

/**
 * Page the work item list belongs to; enables "Add with filters" on supported pages.
 */
type TWorkItemFiltersRowCreateContext = {
  storeType: EIssuesStoreType;
  workspaceSlug: string;
  projectId: string;
};

type TWorkItemFiltersRowProps = TBaseWorkItemFiltersRowProps & {
  createContext?: TWorkItemFiltersRowCreateContext;
};

const CREATE_FROM_FILTERS_STORE_TYPES: Partial<Record<EIssuesStoreType, true>> = {
  [EIssuesStoreType.PROJECT]: true,
};

export const WorkItemFiltersRow = observer(function WorkItemFiltersRow(props: TWorkItemFiltersRowProps) {
  const { createContext, ...rowProps } = props;
  if (createContext && CREATE_FROM_FILTERS_STORE_TYPES[createContext.storeType])
    return <WorkItemFiltersRowWithCreate {...rowProps} createContext={createContext} />;
  return <FiltersRow {...rowProps} />;
});

/**
 * Filters row with an "Add with filters" action that opens the create work item modal prefilled from the
 * active filter conditions. The action is shown only to project members who can create work items and only
 * while at least one condition can be prefilled.
 */
const WorkItemFiltersRowWithCreate = observer(function WorkItemFiltersRowWithCreate(
  props: TBaseWorkItemFiltersRowProps & { createContext: TWorkItemFiltersRowCreateContext }
) {
  const {
    createContext: { storeType, workspaceSlug, projectId },
    ...rowProps
  } = props;
  // states
  const [modalData, setModalData] = useState<Partial<TIssue> | null>(null);
  // store hooks
  const { t } = useTranslation();
  const { allowPermissions } = useUserPermissions();
  const { getProjectStates } = useProjectState();
  const { getProjectCycleDetails } = useCycle();
  const { getProjectModuleIds } = useModule();
  const { getProjectLabelIds } = useLabel();
  const {
    project: { getProjectMemberIds },
  } = useMember();
  // derived values
  const canCreateWorkItem = allowPermissions(
    [EUserProjectRoles.ADMIN, EUserProjectRoles.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );
  const prefill: TWorkItemCreatePrefill = canCreateWorkItem
    ? getWorkItemCreatePrefill(rowProps.filter.allConditions, {
        states: getProjectStates(projectId) ?? [],
        // CE cycles without a status are drafts; completed cycles cannot take new work items
        validCycleIds: (getProjectCycleDetails(projectId) ?? [])
          .filter((cycle) => cycle.status?.toLowerCase() !== "completed")
          .map((cycle) => cycle.id),
        validModuleIds: getProjectModuleIds(projectId) ?? [],
        validLabelIds: getProjectLabelIds(projectId) ?? [],
        memberIds: getProjectMemberIds(projectId, false) ?? [],
      })
    : {};
  const hasPrefill = Object.keys(prefill).length > 0;

  return (
    <>
      <FiltersRow
        {...rowProps}
        trailingActions={
          hasPrefill ? (
            <Button
              variant="secondary"
              size="sm"
              stretch="auto"
              label={t("issue.add.with_filters")}
              icon={<Icon icon={AddOutline} />}
              iconPosition="start"
              onClick={() => setModalData({ ...prefill, project_id: projectId })}
            />
          ) : undefined
        }
      />
      <CreateUpdateIssueModal
        isOpen={modalData !== null}
        onClose={() => setModalData(null)}
        data={modalData ?? undefined}
        storeType={storeType}
      />
    </>
  );
});
