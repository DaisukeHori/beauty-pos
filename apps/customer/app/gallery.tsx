import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Card, Badge, colors, spacing, textStyles, borderRadius, shadows } from '@beauty-pos/ui';
import { hairStyleService, HairStyle } from '@beauty-pos/api';

const categories = [
  { id: 'all', label: 'すべて', length: null },
  { id: 'short', label: 'ショート', length: 'short' },
  { id: 'medium', label: 'ミディアム', length: 'medium' },
  { id: 'long', label: 'ロング', length: 'long' },
];

const { width } = Dimensions.get('window');
const cardWidth = (width - spacing[4] * 3) / 2;

// Default company ID for customer app (should come from session/config in real app)
const DEFAULT_COMPANY_ID = 'demo-company';

export default function GalleryScreen() {
  const [styles, setStyles] = useState<HairStyle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStyles = useCallback(async () => {
    try {
      const length = categories.find(c => c.id === selectedCategory)?.length || undefined;
      const data = await hairStyleService.getAll(DEFAULT_COMPANY_ID, {
        length,
        query: searchQuery || undefined,
      });
      setStyles(data);
    } catch (error) {
      console.error('Error loading hair styles:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadStyles();
  }, [loadStyles]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStyles();
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsLoading(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2 || query.length === 0) {
      setIsLoading(true);
    }
  };

  const handleStyleSelect = async (style: HairStyle) => {
    // Track popularity
    await hairStyleService.incrementPopularity(style.id);
    // Could navigate to detail view or show modal
  };

  const getLengthLabel = (length: string | null) => {
    switch (length) {
      case 'short': return 'ショート';
      case 'medium': return 'ミディアム';
      case 'long': return 'ロング';
      default: return '';
    }
  };

  const renderStyleCard = ({ item }: { item: HairStyle }) => (
    <TouchableOpacity
      style={styleSheets.cardWrapper}
      activeOpacity={0.8}
      onPress={() => handleStyleSelect(item)}
    >
      <View style={styleSheets.styleCard}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styleSheets.styleImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styleSheets.imagePlaceholder}>
            <Text style={styleSheets.placeholderIcon}>💇‍♀️</Text>
          </View>
        )}
        <View style={styleSheets.cardContent}>
          <Text style={styleSheets.styleName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styleSheets.styleDescription} numberOfLines={2}>
            {item.description || 'スタイルの詳細を見る'}
          </Text>
          <View style={styleSheets.tagsContainer}>
            {item.length && (
              <Badge
                colorScheme="neutral"
                variant="subtle"
                size="sm"
                style={styleSheets.tag}
              >
                {getLengthLabel(item.length)}
              </Badge>
            )}
            {item.is_featured && (
              <Badge
                colorScheme="primary"
                variant="subtle"
                size="sm"
                style={styleSheets.tag}
              >
                おすすめ
              </Badge>
            )}
            {item.tags?.slice(0, 1).map((tag, index) => (
              <Badge
                key={index}
                colorScheme={tag === '人気' ? 'primary' : 'neutral'}
                variant="subtle"
                size="sm"
                style={styleSheets.tag}
              >
                {tag}
              </Badge>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && styles.length === 0) {
    return (
      <View style={styleSheets.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styleSheets.loadingText}>スタイルを読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styleSheets.container}>
      {/* Search */}
      <View style={styleSheets.searchContainer}>
        <View style={styleSheets.searchInputContainer}>
          <Text style={styleSheets.searchIcon}>🔍</Text>
          <TextInput
            style={styleSheets.searchInput}
            placeholder="スタイル名、タグで検索..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Text style={styleSheets.clearButton}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styleSheets.categoriesContainer}
        contentContainerStyle={styleSheets.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styleSheets.categoryButton,
              selectedCategory === category.id && styleSheets.categoryButtonActive,
            ]}
            onPress={() => handleCategoryChange(category.id)}
          >
            <Text
              style={[
                styleSheets.categoryText,
                selectedCategory === category.id && styleSheets.categoryTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loading indicator for category/search change */}
      {isLoading && styles.length > 0 && (
        <View style={styleSheets.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
        </View>
      )}

      {/* Styles Grid */}
      <FlatList
        data={styles}
        renderItem={renderStyleCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styleSheets.gridContent}
        columnWrapperStyle={styleSheets.gridRow}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
        ListEmptyComponent={
          <View style={styleSheets.emptyContainer}>
            <Text style={styleSheets.emptyIcon}>🔍</Text>
            <Text style={styleSheets.emptyText}>
              {searchQuery
                ? '該当するスタイルが見つかりません'
                : 'スタイルがありません'}
            </Text>
            {searchQuery && (
              <TouchableOpacity
                style={styleSheets.clearSearchButton}
                onPress={() => handleSearch('')}
              >
                <Text style={styleSheets.clearSearchText}>検索をクリア</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListHeaderComponent={
          styles.length > 0 ? (
            <Text style={styleSheets.resultCount}>
              {styles.length}件のスタイル
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styleSheets = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.neutral[500],
    marginTop: spacing[3],
  },
  loadingOverlay: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: colors.white,
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    ...textStyles.body,
    color: colors.neutral[900],
  },
  clearButton: {
    fontSize: 20,
    color: colors.neutral[400],
    padding: spacing[1],
  },
  categoriesContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  categoriesContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  categoryButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    backgroundColor: colors.neutral[100],
  },
  categoryButtonActive: {
    backgroundColor: colors.primary[500],
  },
  categoryText: {
    ...textStyles.label,
    color: colors.neutral[600],
  },
  categoryTextActive: {
    color: colors.white,
  },
  gridContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  resultCount: {
    ...textStyles.bodySm,
    color: colors.neutral[500],
    marginBottom: spacing[3],
  },
  cardWrapper: {
    width: cardWidth,
    marginBottom: spacing[4],
  },
  styleCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  styleImage: {
    width: '100%',
    aspectRatio: 1,
  },
  imagePlaceholder: {
    backgroundColor: colors.neutral[100],
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  cardContent: {
    padding: spacing[3],
  },
  styleName: {
    ...textStyles.label,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  styleDescription: {
    ...textStyles.caption,
    color: colors.neutral[500],
    marginBottom: spacing[2],
    lineHeight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: spacing[1],
    marginBottom: spacing[1],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  clearSearchButton: {
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
  },
  clearSearchText: {
    ...textStyles.label,
    color: colors.primary[600],
  },
});
