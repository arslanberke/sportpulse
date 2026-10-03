import {
  useApplyFollowChanges,
  useFollows,
  useToggleFollow,
} from '@/features/follows/hooks/use-follows';
import type { FollowKind, UserFollow } from '@/types';

function followFor(
  follows: UserFollow[],
  kind: FollowKind,
  targetId: string,
): UserFollow | undefined {
  return follows.find(
    (f) =>
      f.kind === kind &&
      (kind === 'sport' ? f.sportId : kind === 'league' ? f.leagueId : f.teamId) === targetId,
  );
}

/**
 * A "follow everything" row and the individual rows it stands for: a sport
 * with its leagues, or a league with its teams.
 */
export interface FollowGroup {
  parentKind: FollowKind;
  parentId: string;
  childKind: FollowKind;
  childIds: string[];
}

/**
 * Shared follow state for the sport → league → team screens.
 *
 * Following a parent is stored as a single wildcard row rather than one row
 * per child. So when the user unticks one child while the parent is on, the
 * wildcard is swapped for explicit rows for every other child — which is
 * what "all of them except this one" has to mean. The reverse also holds:
 * ticking the last missing child collapses back to the wildcard.
 */
export function useFollowActions() {
  const { data: follows } = useFollows();
  const toggle = useToggleFollow();
  const apply = useApplyFollowChanges();
  const followList = follows ?? [];
  // Bekleyen istek bitmeden ikinci dokunus, henuz kimligi olmayan satiri
  // silemez; sunucuda takip acik kalirken kutu bos gorunurdu.
  const busy = toggle.isPending || apply.isPending;

  const isFollowing = (kind: FollowKind, targetId: string) =>
    Boolean(followFor(followList, kind, targetId));

  const childFollowIds = (group: FollowGroup) =>
    group.childIds
      .map((id) => followFor(followList, group.childKind, id)?.id)
      .filter((id): id is string => Boolean(id));

  return {
    followList,
    isFollowing,

    /** Plain add/remove, for rows that have no children. */
    toggleFollow: (kind: FollowKind, targetId: string) => {
      if (busy) return;
      const existing = followFor(followList, kind, targetId);
      toggle.mutate({ kind, targetId, followId: existing?.id });
    },

    /** The "follow all of it" row. */
    toggleAll: (group: FollowGroup) => {
      if (busy) return;
      const parent = followFor(followList, group.parentKind, group.parentId);
      if (parent) {
        apply.mutate({ removeIds: [parent.id] });
        return;
      }
      // Individual picks are replaced by the single wildcard row.
      apply.mutate({
        removeIds: childFollowIds(group),
        add: [{ kind: group.parentKind, targetId: group.parentId }],
      });
    },

    /** A child row, aware of a wildcard parent sitting above it. */
    toggleWithin: (group: FollowGroup, childId: string) => {
      if (busy) return;
      const parent = followFor(followList, group.parentKind, group.parentId);

      if (parent) {
        // Drop the wildcard and keep every sibling except this one.
        apply.mutate({
          removeIds: [parent.id, ...childFollowIds(group)],
          add: group.childIds
            .filter((id) => id !== childId)
            .map((id) => ({ kind: group.childKind, targetId: id })),
        });
        return;
      }

      const existing = followFor(followList, group.childKind, childId);
      if (existing) {
        apply.mutate({ removeIds: [existing.id] });
        return;
      }

      const selected = new Set(
        group.childIds.filter((id) => isFollowing(group.childKind, id)),
      );
      selected.add(childId);

      // Everything is picked now, so store it as the wildcard instead.
      if (group.childIds.length > 0 && group.childIds.every((id) => selected.has(id))) {
        apply.mutate({
          removeIds: childFollowIds(group),
          add: [{ kind: group.parentKind, targetId: group.parentId }],
        });
        return;
      }

      apply.mutate({ add: [{ kind: group.childKind, targetId: childId }] });
    },
  };
}
