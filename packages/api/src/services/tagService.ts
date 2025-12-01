import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';

export type Tag = Tables<'tags'>;
export type TagInsert = InsertTables<'tags'>;
export type TagUpdate = UpdateTables<'tags'>;
export type TagItem = Tables<'tag_items'>;

export type EntityType = 'staff' | 'customer' | 'menu' | 'product' | 'reservation' | 'sale' | 'payment';

export interface TagHierarchyNode {
  tag: Tag;
  children: TagHierarchyNode[];
  level: number;
  path: string[];
}

export const tagService = {
  async getAll(companyId: string): Promise<Tag[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Tag | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByEntityType(companyId: string, entityType: EntityType): Promise<Tag[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .contains('applicable_to', [entityType])
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(tag: TagInsert): Promise<Tag> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('tags') as ReturnType<typeof supabase.from>)
      .insert(tag as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return data as Tag;
  },

  async update(id: string, updates: TagUpdate): Promise<Tag> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('tags') as ReturnType<typeof supabase.from>)
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Tag;
  },

  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();

    // First, update children to have no parent
    await (supabase
      .from('tags') as ReturnType<typeof supabase.from>)
      .update({ parent_id: null } as Record<string, unknown>)
      .eq('parent_id', id);

    // Then soft delete the tag
    const { error } = await (supabase
      .from('tags') as ReturnType<typeof supabase.from>)
      .update({ is_active: false } as Record<string, unknown>)
      .eq('id', id);

    if (error) throw error;
  },

  async reorder(companyId: string, tagIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();

    for (let i = 0; i < tagIds.length; i++) {
      await (supabase
        .from('tags') as ReturnType<typeof supabase.from>)
        .update({ sort_order: i } as Record<string, unknown>)
        .eq('id', tagIds[i])
        .eq('company_id', companyId);
    }
  },

  async getHierarchy(companyId: string, entityType?: EntityType): Promise<TagHierarchyNode[]> {
    const tags = entityType
      ? await this.getByEntityType(companyId, entityType)
      : await this.getAll(companyId);

    return buildHierarchy(tags);
  },

  // Tag assignment operations
  async assignTag(tagId: string, entityType: EntityType, entityId: string): Promise<TagItem> {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase
      .from('tag_items') as ReturnType<typeof supabase.from>)
      .upsert({
        tag_id: tagId,
        entity_type: entityType,
        entity_id: entityId,
      } as Record<string, unknown>, {
        onConflict: 'tag_id,entity_type,entity_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data as TagItem;
  },

  async removeTag(tagId: string, entityType: EntityType, entityId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('tag_items')
      .delete()
      .eq('tag_id', tagId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) throw error;
  },

  async getEntityTags(entityType: EntityType, entityId: string): Promise<Tag[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tag_items')
      .select(`
        tag:tags(*)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) throw error;
    const typedData = data as Array<{ tag: Tag }> | null;
    return typedData?.map((d) => d.tag).filter(Boolean) as Tag[] || [];
  },

  async getEntitiesByTag(tagId: string, entityType: EntityType): Promise<string[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tag_items')
      .select('entity_id')
      .eq('tag_id', tagId)
      .eq('entity_type', entityType);

    if (error) throw error;
    const typedData = data as Array<{ entity_id: string }> | null;
    return typedData?.map((d) => d.entity_id) || [];
  },

  async setEntityTags(entityType: EntityType, entityId: string, tagIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();

    // Remove all existing tags
    await supabase
      .from('tag_items')
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    // Add new tags
    if (tagIds.length > 0) {
      const items = tagIds.map((tagId) => ({
        tag_id: tagId,
        entity_type: entityType,
        entity_id: entityId,
      }));

      const { error } = await (supabase
        .from('tag_items') as ReturnType<typeof supabase.from>)
        .insert(items as unknown as Record<string, unknown>[]);

      if (error) throw error;
    }
  },

  async searchByTags(
    companyId: string,
    entityType: EntityType,
    tagIds: string[],
    matchAll: boolean = false
  ): Promise<string[]> {
    const supabase = getSupabaseClient();

    if (tagIds.length === 0) return [];

    const { data, error } = await supabase
      .from('tag_items')
      .select('entity_id, tag_id')
      .eq('entity_type', entityType)
      .in('tag_id', tagIds);

    if (error) throw error;

    if (!data) return [];

    interface TagItem { entity_id: string; tag_id: string; }
    const typedData = data as TagItem[];

    if (matchAll) {
      // Return entities that have ALL specified tags
      const entityTagCounts = new Map<string, Set<string>>();
      typedData.forEach((item) => {
        if (!entityTagCounts.has(item.entity_id)) {
          entityTagCounts.set(item.entity_id, new Set());
        }
        entityTagCounts.get(item.entity_id)!.add(item.tag_id);
      });

      return Array.from(entityTagCounts.entries())
        .filter(([, tags]) => tags.size === tagIds.length)
        .map(([entityId]) => entityId);
    } else {
      // Return entities that have ANY of the specified tags
      return [...new Set(typedData.map((item) => item.entity_id))];
    }
  },
};

function buildHierarchy(tags: Tag[]): TagHierarchyNode[] {
  const tagMap = new Map<string, TagHierarchyNode>();
  const roots: TagHierarchyNode[] = [];

  // Create nodes
  tags.forEach((tag) => {
    tagMap.set(tag.id, {
      tag,
      children: [],
      level: 0,
      path: [tag.id],
    });
  });

  // Build hierarchy
  tags.forEach((tag) => {
    const node = tagMap.get(tag.id)!;
    if (tag.parent_id && tagMap.has(tag.parent_id)) {
      const parent = tagMap.get(tag.parent_id)!;
      node.level = parent.level + 1;
      node.path = [...parent.path, tag.id];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort nodes
  const sortNodes = (nodes: TagHierarchyNode[]) => {
    nodes.sort((a, b) => a.tag.sort_order - b.tag.sort_order);
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);

  return roots;
}
