export type EntityType =
  | 'customer'
  | 'staff'
  | 'menu'
  | 'product'
  | 'material'
  | 'sale'
  | 'reservation'
  | 'store'
  | 'coupon'
  | 'ticket'
  | 'payment_method'
  | 'visit_record';

export interface Tag {
  id: string;
  companyId: string;
  name: string;
  color: string;
  icon?: string;
  parentId?: string;
  applicableTo: EntityType[];
  sortOrder: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  // Joined data
  children?: Tag[];
  parent?: Tag;
}

export interface TagItem {
  id: string;
  tagId: string;
  entityType: EntityType;
  entityId: string;
  createdAt: string;
}

export interface TagHierarchyNode {
  tag: Tag;
  children: TagHierarchyNode[];
  level: number;
  path: string[];
}

export interface CreateTagInput {
  companyId: string;
  name: string;
  color?: string;
  icon?: string;
  parentId?: string;
  applicableTo: EntityType[];
  sortOrder?: number;
}

export interface UpdateTagInput extends Partial<Omit<CreateTagInput, 'companyId'>> {}

export interface TagFilter {
  entityType?: EntityType;
  parentId?: string | null;
  search?: string;
}

export function buildTagHierarchy(tags: Tag[]): TagHierarchyNode[] {
  const tagMap = new Map<string, TagHierarchyNode>();
  const roots: TagHierarchyNode[] = [];

  // First pass: create nodes
  tags.forEach(tag => {
    tagMap.set(tag.id, {
      tag,
      children: [],
      level: 0,
      path: [tag.id],
    });
  });

  // Second pass: build hierarchy
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

  // Sort by sortOrder
  const sortNodes = (nodes: TagHierarchyNode[]) => {
    nodes.sort((a, b) => a.tag.sortOrder - b.tag.sortOrder);
    nodes.forEach(node => sortNodes(node.children));
  };
  sortNodes(roots);

  return roots;
}
