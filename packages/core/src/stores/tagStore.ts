import { create } from 'zustand';
import type { Tag, TagHierarchyNode, EntityType, buildTagHierarchy } from '../models';

interface TagState {
  tags: Tag[];
  selectedTag: Tag | null;
  isLoading: boolean;
  error: string | null;
}

interface TagActions {
  setTags: (tags: Tag[]) => void;
  setSelectedTag: (tag: Tag | null) => void;
  addTag: (tag: Tag) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  removeTag: (id: string) => void;
  getTagsByEntityType: (entityType: EntityType) => Tag[];
  getTagHierarchy: (entityType?: EntityType) => TagHierarchyNode[];
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: TagState = {
  tags: [],
  selectedTag: null,
  isLoading: false,
  error: null,
};

export const useTagStore = create<TagState & TagActions>((set, get) => ({
  ...initialState,

  setTags: (tags) =>
    set({ tags }),

  setSelectedTag: (selectedTag) =>
    set({ selectedTag }),

  addTag: (tag) =>
    set((state) => ({
      tags: [...state.tags, tag],
    })),

  updateTag: (id, updates) =>
    set((state) => ({
      tags: state.tags.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
      selectedTag:
        state.selectedTag?.id === id
          ? { ...state.selectedTag, ...updates }
          : state.selectedTag,
    })),

  removeTag: (id) =>
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== id),
      selectedTag:
        state.selectedTag?.id === id ? null : state.selectedTag,
    })),

  getTagsByEntityType: (entityType) => {
    const { tags } = get();
    return tags.filter((t) => t.applicableTo.includes(entityType));
  },

  getTagHierarchy: (entityType) => {
    const { tags } = get();
    const filteredTags = entityType
      ? tags.filter((t) => t.applicableTo.includes(entityType))
      : tags;
    return buildTagHierarchyLocal(filteredTags);
  },

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  reset: () =>
    set(initialState),
}));

// Local implementation of buildTagHierarchy
function buildTagHierarchyLocal(tags: Tag[]): TagHierarchyNode[] {
  const tagMap = new Map<string, TagHierarchyNode>();
  const roots: TagHierarchyNode[] = [];

  tags.forEach(tag => {
    tagMap.set(tag.id, {
      tag,
      children: [],
      level: 0,
      path: [tag.id],
    });
  });

  tags.forEach(tag => {
    const node = tagMap.get(tag.id)!;
    if (tag.parentId && tagMap.has(tag.parentId)) {
      const parent = tagMap.get(tag.parentId)!;
      node.level = parent.level + 1;
      node.path = [...parent.path, tag.id];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: TagHierarchyNode[]) => {
    nodes.sort((a, b) => a.tag.sortOrder - b.tag.sortOrder);
    nodes.forEach(node => sortNodes(node.children));
  };
  sortNodes(roots);

  return roots;
}
